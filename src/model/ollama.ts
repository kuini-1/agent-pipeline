import { z } from "zod";
import { PermanentError, type ModelClient, type ModelRequest, type ModelResponse } from "./client.js";

export interface OllamaOptions {
  model: string; // e.g. "qwen3:4b-instruct"
  baseURL?: string; // default $OLLAMA_HOST or http://127.0.0.1:11434
  maxTokens?: number; // cap on output tokens per call
}

interface Chunk {
  model?: string;
  message?: { content: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

// One request at a time per Ollama server. A local Ollama usually serves one
// generation at a time, so concurrent agent steps would otherwise wait inside
// Ollama's queue with no response yet, and Node's fetch gives up after
// waiting 300 s for response headers. Queuing here instead keeps every
// request short.
const lanes = new Map<string, Promise<unknown>>();

function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = lanes.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  lanes.set(key, next);
  return next;
}

// Runs the agents on a local model through Ollama's native chat API. Ollama's
// Anthropic-compatible endpoint ignores structured-output requests, so this
// client sends the agent's schema as Ollama's `format` instead, which
// constrains decoding to that JSON shape. The content checks and repair
// rounds in validate.ts work the same as with Claude.
export class OllamaClient implements ModelClient {
  readonly name: string;
  private baseURL: string;

  constructor(private opts: OllamaOptions) {
    this.name = `ollama:${opts.model}`;
    const host = opts.baseURL ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    this.baseURL = (host.startsWith("http") ? host : `http://${host}`).replace(/\/$/, "");
  }

  generate(req: ModelRequest): Promise<ModelResponse> {
    return serialize(this.baseURL, () => this.call(req));
  }

  private async call(req: ModelRequest): Promise<ModelResponse> {
    req.signal?.throwIfAborted();
    const schema = z.toJSONSchema(req.schema);
    // Small models fill a schema better when they can read its field descriptions.
    const system = `${req.system}\n\nRespond with one JSON object that matches this JSON schema:\n${JSON.stringify(schema)}`;
    const body = {
      model: this.opts.model,
      // Streaming: headers arrive as soon as generation starts, and no single
      // wait exceeds fetch's limits however long the answer takes.
      stream: true,
      format: schema,
      messages: [{ role: "system", content: system }, ...req.turns],
      options: { temperature: 0, seed: 42, num_predict: Math.min(req.maxTokens, this.opts.maxTokens ?? 2048) },
    };
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (err) {
      throw new Error(`ollama: ${err instanceof Error ? err.message : err}`); // network or timeout: retried
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Chunk;
      const msg = `ollama HTTP ${res.status}: ${data.error ?? res.statusText}`;
      // A missing model or a bad request won't fix itself on retry.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw new PermanentError(msg);
      throw new Error(msg);
    }

    let text = "";
    let last: Chunk = {};
    const decoder = new TextDecoder();
    let buffered = "";
    const handle = (line: string) => {
      if (!line.trim()) return;
      const c = JSON.parse(line) as Chunk;
      if (c.error) throw new Error(`ollama: ${c.error}`);
      text += c.message?.content ?? "";
      if (c.done) last = c;
    };
    for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
      buffered += decoder.decode(part, { stream: true });
      let nl: number;
      while ((nl = buffered.indexOf("\n")) >= 0) {
        handle(buffered.slice(0, nl));
        buffered = buffered.slice(nl + 1);
      }
    }
    handle(buffered + decoder.decode());

    // Thinking models can leave reasoning before a closing tag even when told not to think.
    const end = text.lastIndexOf("</think>");
    if (end >= 0) text = text.slice(end + "</think>".length).trim();
    return {
      text,
      model: this.name,
      stopReason: last.done_reason === "length" ? "max_tokens" : "end_turn",
      usage: { inputTokens: last.prompt_eval_count ?? 0, outputTokens: last.eval_count ?? 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }
}
