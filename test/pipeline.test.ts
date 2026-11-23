// End-to-end tests against a real Redis. Skipped when REDIS_URL is not set
// or the server doesn't answer.
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { RefusedError, type ModelClient } from "../src/model/client.js";
import { MockModel, demoFaults } from "../src/model/mock.js";
import { envelope, type WriteRequest } from "../src/protocol.js";
import { Queues, queuePrefix } from "../src/pipeline/queues.js";
import { newRunId, startRun, waitForRun, type RunOptions } from "../src/pipeline/runs.js";
import { RunStore, type RunConfig } from "../src/pipeline/store.js";
import { startWorkers } from "../src/pipeline/workers.js";
import { criteria, fixtureSource, jobs, profile } from "./helpers.js";

const url = process.env.REDIS_URL;

async function reachable(u: string | undefined): Promise<boolean> {
  if (!u) return false;
  const r = new Redis(u, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
  try {
    await r.connect();
    return (await r.ping()) === "PONG";
  } catch {
    return false;
  } finally {
    r.disconnect();
  }
}

const redisUp = await reachable(url);
const request = { profile, criteria };
const fast: RunOptions = { model: "mock", source: fixtureSource, backoffMs: 50, timeLimitMs: 30_000 };

describe.skipIf(!redisUp)("pipeline on Redis", () => {
  let redis: Redis;
  let store: RunStore;
  let queues: Queues;
  let workers: { close(): Promise<void> } | undefined;

  const boot = (models?: (c: RunConfig) => ModelClient) => {
    workers = startWorkers({ connection: redis, store, queues, models });
  };
  const run = async (options: Partial<RunOptions> = {}) => {
    const r = await startRun(store, queues, request, { ...fast, ...options });
    await waitForRun(store, r.id, 20_000);
    return store.snapshot(r.id).then((s) => s!);
  };

  beforeAll(() => {
    redis = new Redis(url!, { maxRetriesPerRequest: null });
    store = new RunStore(redis);
    queues = new Queues(redis, store);
  });
  afterEach(async () => {
    await workers?.close();
    workers = undefined;
  });
  afterAll(async () => {
    await queues.close();
    redis.disconnect();
  });

  it("runs the demo: a repair, a revision, a retry and a failed job, then one report", async () => {
    boot();
    const s = await run({ faults: demoFaults });
    const byRank = s.results.map((r) => [r.rank, r.status, r.revisions]);
    expect(byRank).toEqual([
      [1, "approved", 1],
      [2, "approved", 0],
      [3, "failed", 0],
    ]);
    expect(s.run.status).toBe("done");
    expect(s.run.stopReason).toBeUndefined();

    const ev = (type: string, jobRef: string) => s.events.filter((e) => e.type === type && e.jobRef === jobRef);
    expect(ev("attempt", "fx-quillstack-llm-platform").map((e) => e.ok)).toEqual([false, true, true, true, true]);
    expect(ev("step.retry", "fx-tidewater-retrieval")).toHaveLength(1);
    expect(ev("attempt", "fx-brightloop-applied-ai").map((e) => e.ok)).toEqual([false, false, false]);
    expect(s.results[2]!.reason).toMatch(/still invalid after 2 repair round/);

    const md = (await store.report(s.run.id))!;
    for (const heading of ["## Outcome", "## Applications", "## Failures and recoveries", "## Timeline"]) expect(md).toContain(heading);
    expect(md).toContain("Fortune 500");
  });

  it("stops at the token budget and still finishes with a report", async () => {
    boot();
    // The budget is checked when a step starts, so research (started at 0
    // tokens) runs and overshoots it; every writer step after it is stopped.
    const s = await run({ tokenBudget: 1000 });
    expect(s.run.stopReason).toMatch(/token budget/);
    expect(s.run.tokens).toBeGreaterThan(1000);
    expect(s.results.map((r) => r.status)).toEqual(["stopped", "stopped", "stopped"]);
    expect(await store.report(s.run.id)).toContain("stopped early: token budget");
  });

  it("stops at the time limit before any model call", async () => {
    boot();
    const s = await run({ timeLimitMs: 1 });
    expect(s.run.stopReason).toMatch(/time limit/);
    expect(s.results).toEqual([]);
    expect(s.events.some((e) => e.type === "attempt")).toBe(false);
  });

  it("fails a refused job at once, without queue retries, and finishes the others", async () => {
    boot((c) => {
      const mock = new MockModel({ latencyMs: 0 });
      return {
        name: mock.name,
        generate: (req) => ((req.input as WriteRequest).rank === 2 && req.agent === "writer" ? Promise.reject(new RefusedError("the model declined")) : mock.generate(req)),
      };
    });
    const s = await run();
    expect(s.results.map((r) => r.status)).toEqual(["approved", "failed", "approved"]);
    expect(s.results[1]!.reason).toBe("the model declined");
    expect(s.events.filter((e) => e.type === "step.retry")).toEqual([]);
  });

  it("retries transient errors with backoff, then fails the job on the last delivery", async () => {
    boot((c) => {
      const mock = new MockModel();
      return {
        name: mock.name,
        generate: (req) => ((req.input as WriteRequest).rank === 1 && req.agent === "writer" ? Promise.reject(new Error("socket hang up")) : mock.generate(req)),
      };
    });
    const s = await run({ queueAttempts: 3 });
    const writer1 = s.events.filter((e) => e.agent === "writer" && e.jobRef === "fx-quillstack-llm-platform");
    expect(writer1.filter((e) => e.type === "step.retry").map((e) => e.queueAttempt)).toEqual([0, 1]);
    expect(writer1.filter((e) => e.type === "step.failed").map((e) => e.queueAttempt)).toEqual([2]);
    expect(s.results.map((r) => r.status)).toEqual(["failed", "approved", "approved"]);
  });

  it("reuses a checkpointed research result on redelivery instead of asking again", async () => {
    const id = newRunId();
    const r = await startRun(store, queues, request, fast, id); // enqueued; no workers yet
    await store.saveJobs(r.id, jobs);
    await store.checkpointResearch(r.id, {
      selected: [{ job_id: "fx-glimmer-ai-features", match_score: 70, why_match: "earlier delivery", key_requirements: ["TypeScript"], concerns: [] }],
      rejected: [],
    });
    boot();
    await waitForRun(store, r.id, 20_000);
    const s = (await store.snapshot(r.id))!;
    expect(s.events.some((e) => e.type === "attempt" && e.agent === "research")).toBe(false);
    expect(s.results.map((x) => x.jobId)).toEqual(["fx-glimmer-ai-features"]);
  });

  it("counts a redelivered job result once in the fan-in", async () => {
    const id = newRunId();
    await store.create({ id, createdAt: Date.now(), status: "running", tokens: 0, config: {} as RunConfig, request });
    await store.setPending(id, 2);
    const result = (jobId: string) => ({ jobId, rank: 1, status: "approved" as const, revisions: 0 });
    expect(await store.finishJob(id, result("a"))).toBe(false);
    expect(await store.finishJob(id, result("a"))).toBe(false); // duplicate: no decrement
    expect(await store.pending(id)).toBe(1);
    expect(await store.finishJob(id, result("b"))).toBe(true);
    expect(await store.finishJob(id, result("b"))).toBe(true); // redelivery after the last job: report again (deduped by id)
    expect(await store.pending(id)).toBe(0);
    expect((await store.results(id)).length).toBe(2);
  });

  it("turns a duplicate send into one queue job and one logged message", async () => {
    const id = newRunId();
    const config = { queueAttempts: 1, backoffMs: 10 } as RunConfig;
    await store.create({ id, createdAt: Date.now(), status: "running", tokens: 0, config, request });
    const env = envelope<WriteRequest>({ runId: id, from: "research", to: "writer", jobRef: "x", revision: 0, payload: {} as WriteRequest });
    await queues.send(env, config);
    await queues.send(env, config);
    const q = new Queue("writer", { connection: redis, prefix: queuePrefix });
    try {
      expect((await q.getJob(env.id))?.id).toBe(env.id);
      const sent = (await store.snapshot(id))!.events.filter((e) => e.type === "message.sent");
      expect(sent).toHaveLength(1);
    } finally {
      await q.remove(env.id);
      await q.close();
    }
  });
});
