import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPermanent } from "../src/model/client.js";
import { OllamaClient } from "../src/model/ollama.js";
import { ReviewOutput } from "../src/schemas.js";
import { meta } from "./helpers.js";

// A stand-in for Ollama's /api/chat. It records requests, streams replies
// from a queue as NDJSON in a few chunks, and counts requests in flight.
let server: Server;
let base = "";
const requests: Record<string, unknown>[] = [];
type Reply = { status: number; body?: unknown; chunks?: object[]; delayMs?: number };
const replies: Reply[] = [];
let inFlight = 0;
let maxInFlight = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      requests.push(JSON.parse(raw));
      const r = replies.shift() ?? { status: 500, body: { error: "no reply queued" } };
      await new Promise((ok) => setTimeout(ok, r.delayMs ?? 0));
      res.writeHead(r.status, { "content-type": r.chunks ? "application/x-ndjson" : "application/json" });
      if (r.chunks) {
        for (const c of r.chunks) res.write(JSON.stringify(c) + "\n");
        res.end();
      } else {
        res.end(JSON.stringify(r.body));
      }
      inFlight--;
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

// Splits text into streamed chunks the way Ollama does, ending with the stats chunk.
function stream(text: string, done: object): object[] {
  const parts = text.match(/.{1,7}/gs) ?? [];
  return [...parts.map((p) => ({ message: { content: p }, done: false })), { message: { content: "" }, done: true, ...done }];
}

const call = (client: OllamaClient) =>
  client.generate({
    agent: "reviewer",
    system: "You review drafts.",
    turns: [{ role: "user", content: "Review this." }],
    schema: ReviewOutput,
    maxTokens: 8000,
    input: {},
    repairRound: 0,
    meta,
  });

describe("OllamaClient", () => {
  it("sends the agent's schema as a decoding constraint and assembles the streamed reply", async () => {
    const verdict = { job_id: "j", verdict: "approve", score: 8, issues: [], unsupported_claims: [] };
    replies.push({ status: 200, chunks: stream(JSON.stringify(verdict), { done_reason: "stop", prompt_eval_count: 120, eval_count: 40 }) });
    const resp = await call(new OllamaClient({ model: "qwen3:4b-instruct", baseURL: base }));

    const sent = requests.at(-1) as { model: string; stream: boolean; format: { properties: Record<string, unknown> }; messages: { role: string; content: string }[]; options: { num_predict: number } };
    expect(sent.model).toBe("qwen3:4b-instruct");
    expect(sent.stream).toBe(true);
    expect(Object.keys(sent.format.properties)).toEqual(["job_id", "verdict", "score", "issues", "unsupported_claims"]);
    expect(sent.messages[0]!.role).toBe("system");
    expect(sent.messages[0]!.content).toContain("matches this JSON schema");
    expect(sent.messages[1]).toEqual({ role: "user", content: "Review this." });
    expect(sent.options.num_predict).toBe(2048); // capped below the agent's 8000

    expect(JSON.parse(resp.text)).toEqual(verdict);
    expect(resp.model).toBe("ollama:qwen3:4b-instruct");
    expect(resp.usage.inputTokens).toBe(120);
    expect(resp.usage.outputTokens).toBe(40);
    expect(resp.stopReason).toBe("end_turn");
  });

  it("reports a cut-off answer as max_tokens and drops leftover reasoning", async () => {
    replies.push({ status: 200, chunks: stream('thinking...</think>\n{"job_id": "j"', { done_reason: "length" }) });
    const resp = await call(new OllamaClient({ model: "m", baseURL: base }));
    expect(resp.stopReason).toBe("max_tokens");
    expect(resp.text).toBe('{"job_id": "j"');
  });

  it("sends one request at a time to a server, however many steps call it", async () => {
    maxInFlight = 0;
    for (let i = 0; i < 3; i++) replies.push({ status: 200, delayMs: 50, chunks: stream("{}", { done_reason: "stop" }) });
    const a = new OllamaClient({ model: "a", baseURL: base });
    const b = new OllamaClient({ model: "b", baseURL: base }); // another model on the same server shares the lane
    await Promise.all([call(a), call(b), call(a)]);
    expect(maxInFlight).toBe(1);
  });

  it("treats a missing model as permanent and a server error as retryable", async () => {
    replies.push({ status: 404, body: { error: "model 'nope' not found" } });
    const missing = await call(new OllamaClient({ model: "nope", baseURL: base })).catch((e) => e);
    expect(isPermanent(missing)).toBe(true);
    expect(missing.message).toContain("not found");

    replies.push({ status: 503, body: { error: "server busy" } });
    const busy = await call(new OllamaClient({ model: "m", baseURL: base })).catch((e) => e);
    expect(busy).toBeInstanceOf(Error);
    expect(isPermanent(busy)).toBe(false);
  });
});
