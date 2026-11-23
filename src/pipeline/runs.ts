import { randomBytes } from "node:crypto";
import { envelope, type ResearchRequest } from "../protocol.js";
import type { Queues } from "./queues.js";
import type { RunConfig, RunRecord, RunStore } from "./store.js";

export const defaults = {
  effort: "medium",
  timeLimitMs: 10 * 60_000,
  tokenBudget: 400_000,
  maxRevisions: 2,
  maxRepairs: 2,
  stepTimeoutMs: 3 * 60_000,
  queueAttempts: 3,
  backoffMs: 2000,
} satisfies Partial<RunConfig>;

export type RunOptions = Partial<Omit<RunConfig, "deadlineAt">> & Pick<RunConfig, "model" | "source">;

export function newRunId(): string {
  const t = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `run-${t}-${randomBytes(2).toString("hex")}`;
}

/** Creates the run and sends the first envelope to the research agent. */
export async function startRun(store: RunStore, queues: Queues, request: ResearchRequest, options: RunOptions, id = newRunId()): Promise<RunRecord> {
  const createdAt = Date.now();
  const config: RunConfig = { ...defaults, ...options, deadlineAt: createdAt + (options.timeLimitMs ?? defaults.timeLimitMs) };
  const run: RunRecord = { id, createdAt, status: "running", tokens: 0, config, request };
  await store.create(run);
  await store.event(id, { type: "run.created", agent: "client", detail: `model ${config.model}, source ${config.source}` });
  await queues.send(envelope<ResearchRequest>({ runId: id, from: "client", to: "research", revision: 0, payload: request }), config);
  return run;
}

/** Polls until the report is written. */
export async function waitForRun(store: RunStore, id: string, timeoutMs: number, onProgress?: (line: string) => void): Promise<RunRecord> {
  const until = Date.now() + timeoutMs;
  let last = "";
  for (;;) {
    const run = await store.get(id);
    if (!run) throw new Error(`no run ${id}`);
    if (run.status === "done") return run;
    const pending = await store.pending(id);
    const line = `${run.status}; ${pending === null ? "research" : `${pending} job(s) in flight`}; ${run.tokens} tokens`;
    if (line !== last) onProgress?.(line);
    last = line;
    if (Date.now() > until) throw new Error(`run ${id} did not finish in time; check "pipeline status ${id}"`);
    await new Promise((r) => setTimeout(r, 100));
  }
}
