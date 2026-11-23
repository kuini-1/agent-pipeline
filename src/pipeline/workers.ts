// The queue workers: one per agent. Each step follows the same contract.
//
//   1. Check the stop rules (cancelled, time limit, token budget). If one
//      applies, record the job as "stopped" and hand off without calling the
//      model.
//   2. Run the agent. Its output is validated, with repair rounds on failure.
//   3. Hand off: enqueue an envelope for the next agent, or record the job's
//      terminal result and, if it was the last one in flight, enqueue the
//      report.
//
// Errors split two ways. A PermanentError (refusal, rejected request, output
// still invalid after repairs) ends that job as "failed" right away. Anything
// else (rate limits, overload, timeouts, network) is thrown back to BullMQ,
// which retries the step with exponential backoff; on the last attempt the
// job is recorded as "failed" too. Either way the other jobs keep going and
// the run still ends with a report.
import { UnrecoverableError, Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { runAgent, type RunContext } from "../agents/agent.js";
import { researchAgent } from "../agents/research.js";
import { reviewerAgent } from "../agents/reviewer.js";
import { countWords } from "../agents/agent.js";
import { writerAgent } from "../agents/writer.js";
import { ClaudeClient } from "../model/anthropic.js";
import { isPermanent, totalTokens, type ModelClient } from "../model/client.js";
import { MockModel } from "../model/mock.js";
import { OllamaClient } from "../model/ollama.js";
import {
  envelope,
  type AgentName,
  type Envelope,
  type JobResult,
  type ReportRequest,
  type ResearchRequest,
  type ReviewRequest,
  type WriteRequest,
} from "../protocol.js";
import { renderReport } from "../report.js";
import { loadJobs } from "../sources/jobs.js";
import { InvalidOutputError } from "../validate.js";
import { queuePrefix, type Queues } from "./queues.js";
import type { RunConfig, RunRecord, RunStore } from "./store.js";

export interface WorkerDeps {
  connection: Redis;
  store: RunStore;
  queues: Queues;
  concurrency?: number;
  /** Override model construction (tests use scripted models). */
  models?: (config: RunConfig) => ModelClient;
  log?: (line: string) => void;
}

const clients = new Map<string, ModelClient>();

export function modelFor(config: RunConfig): ModelClient {
  if (config.model === "mock") return new MockModel({ faults: config.faults, latencyMs: config.mockLatencyMs });
  const key = `${config.model}/${config.effort}`;
  let c = clients.get(key);
  if (!c) {
    c = config.model.startsWith("ollama:")
      ? new OllamaClient({ model: config.model.slice("ollama:".length) })
      : new ClaudeClient({ model: config.model, effort: config.effort });
    clients.set(key, c);
  }
  return c;
}

export function errorMessage(err: unknown): string {
  if (err instanceof InvalidOutputError) return `${err.message}: ${err.errors.join("; ")}`;
  return err instanceof Error ? err.message : String(err);
}

interface StepContext<T> {
  env: Envelope<T>;
  run: RunRecord;
  model: ModelClient;
  agent: RunContext;
}

interface StepHandlers<T> {
  body(ctx: StepContext<T>): Promise<void>;
  /** Called instead of a handoff when the step is stopped or fails for good. */
  end(ctx: Omit<StepContext<T>, "agent" | "model">, status: "stopped" | "failed", reason: string): Promise<void>;
}

export function startWorkers(deps: WorkerDeps): { close(): Promise<void> } {
  const { store, queues } = deps;
  const models = deps.models ?? modelFor;
  const log = deps.log ?? (() => {});
  const concurrency = deps.concurrency ?? 4;

  async function step<T>(name: AgentName, job: Job<Envelope<T>>, h: StepHandlers<T>): Promise<void> {
    const env = job.data;
    const run = await store.get(env.runId);
    if (!run) throw new UnrecoverableError(`unknown run ${env.runId}`);
    const base = { agent: name, jobRef: env.jobRef, revision: env.revision, queueAttempt: job.attemptsMade };

    const stop = await store.stopReason(run);
    if (stop) {
      await store.event(run.id, { type: "step.stopped", ...base, detail: stop });
      log(`${env.id} stopped: ${stop}`);
      return h.end({ env, run }, "stopped", stop);
    }

    await store.event(run.id, { type: "step.started", ...base });
    const timeout = Math.max(1, Math.min(run.config.stepTimeoutMs, run.config.deadlineAt - Date.now()));
    const agent: RunContext = {
      meta: { runId: run.id, jobRef: env.jobRef, revision: env.revision, queueAttempt: job.attemptsMade },
      signal: AbortSignal.timeout(timeout),
      maxRepairs: run.config.maxRepairs,
      onAttempt: async (a) => {
        const tokens = totalTokens(a.usage);
        await store.addTokens(run.id, tokens);
        await store.event(run.id, {
          type: "attempt",
          ...base,
          round: a.round,
          ok: a.ok,
          errors: a.errors.length ? a.errors : undefined,
          model: a.model,
          tokens,
          usage: a.usage,
          ms: a.ms,
        });
      },
    };

    try {
      await h.body({ env, run, model: models(run.config), agent });
    } catch (err) {
      const message = errorMessage(err);
      const lastTry = isPermanent(err) || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (!lastTry) {
        await store.event(run.id, { type: "step.retry", ...base, detail: message });
        log(`${env.id} will retry: ${message}`);
        throw err;
      }
      await store.event(run.id, { type: "step.failed", ...base, detail: message });
      log(`${env.id} failed: ${message}`);
      await h.end({ env, run }, "failed", message);
      throw new UnrecoverableError(message);
    }
  }

  const sendReport = (run: RunRecord, from: AgentName) =>
    queues.send(envelope<ReportRequest>({ runId: run.id, from, to: "report", revision: 0, payload: {} }), run.config);

  async function finish(run: RunRecord, from: AgentName, result: JobResult) {
    if (await store.finishJob(run.id, result, from)) await sendReport(run, from);
  }

  const research = (job: Job<Envelope<ResearchRequest>>) =>
    step("research", job, {
      async body({ env, run, model, agent }) {
        const req = env.payload;
        // Checkpoint: if an earlier delivery of this step got as far as a
        // validated selection, reuse it rather than asking the model again
        // and maybe getting a different list.
        let out = await store.research(run.id);
        if (!out) {
          const jobs = await loadJobs(run.config.source, req.criteria, agent.signal);
          await store.saveJobs(run.id, jobs);
          await store.event(run.id, { type: "source.loaded", agent: "research", detail: `${jobs.length} postings from ${run.config.source}` });
          if (jobs.length === 0) {
            await store.setPending(run.id, 0);
            return sendReport(run, "research");
          }
          const res = await runAgent(model, researchAgent, { ...req, jobs }, agent);
          out = await store.checkpointResearch(run.id, res.value);
          await store.event(run.id, { type: "step.done", agent: "research", detail: `selected ${out.selected.length}, rejected ${out.rejected.length}` });
        }
        const byId = new Map((await store.jobs(run.id)).map((j) => [j.id, j]));
        const selected = [...out.selected].sort((a, b) => b.match_score - a.match_score);
        await store.setPending(run.id, selected.length);
        if (selected.length === 0) return sendReport(run, "research");
        for (const [i, s] of selected.entries()) {
          await queues.send(
            envelope<WriteRequest>({
              runId: run.id,
              from: "research",
              to: "writer",
              jobRef: s.job_id,
              revision: 0,
              payload: { profile: req.profile, job: byId.get(s.job_id)!, research: s, rank: i + 1 },
            }),
            run.config,
          );
        }
      },
      async end({ run }) {
        await store.setPending(run.id, 0);
        await sendReport(run, "research");
      },
    });

  const writer = (job: Job<Envelope<WriteRequest>>) =>
    step("writer", job, {
      async body({ env, run, model, agent }) {
        const { profile, job: posting, research: notes, rank } = env.payload;
        const res = await runAgent(model, writerAgent, env.payload, agent);
        await store.event(run.id, {
          type: "step.done",
          agent: "writer",
          jobRef: env.jobRef,
          revision: env.revision,
          detail: `draft ready: ${countWords(res.value.cover_letter)} words, ${res.value.claims.length} claims checked`,
        });
        await queues.send(
          envelope<ReviewRequest>({
            runId: run.id,
            from: "writer",
            to: "reviewer",
            jobRef: env.jobRef,
            revision: env.revision,
            payload: { profile, job: posting, research: notes, rank, draft: res.value },
          }),
          run.config,
        );
      },
      async end({ env, run }, status, reason) {
        const p = env.payload;
        // Keep the last draft that passed validation, if this was a revision.
        await finish(run, "writer", { jobId: p.job.id, rank: p.rank, status, reason, revisions: env.revision, draft: p.previous, review: p.feedback });
      },
    });

  const reviewer = (job: Job<Envelope<ReviewRequest>>) =>
    step("reviewer", job, {
      async body({ env, run, model, agent }) {
        const { profile, job: posting, research: notes, rank, draft } = env.payload;
        const review = (await runAgent(model, reviewerAgent, env.payload, agent)).value;
        const top = review.issues.find((i) => i.severity !== "minor") ?? review.issues[0];
        await store.event(run.id, {
          type: "step.done",
          agent: "reviewer",
          jobRef: env.jobRef,
          revision: env.revision,
          detail: `${review.verdict}, ${review.score}/10${top ? ` (${top.severity}: ${top.issue})` : ""}`,
        });
        const result = { jobId: posting.id, rank, revisions: env.revision, draft, review };
        if (review.verdict === "approve") return finish(run, "reviewer", { ...result, status: "approved" });
        if (env.revision >= run.config.maxRevisions) {
          return finish(run, "reviewer", {
            ...result,
            status: "gave_up",
            reason: `the reviewer still asked for changes after ${run.config.maxRevisions} revision(s)`,
          });
        }
        await queues.send(
          envelope<WriteRequest>({
            runId: run.id,
            from: "reviewer",
            to: "writer",
            jobRef: env.jobRef,
            revision: env.revision + 1,
            payload: { profile, job: posting, research: notes, rank, previous: draft, feedback: review },
          }),
          run.config,
        );
      },
      async end({ env, run }, status, reason) {
        const p = env.payload;
        await finish(run, "reviewer", { jobId: p.job.id, rank: p.rank, status, reason, revisions: env.revision, draft: p.draft });
      },
    });

  const report = async (job: Job<Envelope<ReportRequest>>) => {
    const runId = job.data.runId;
    await store.setStatus(runId, "reporting");
    const snap = await store.snapshot(runId);
    if (!snap) throw new UnrecoverableError(`unknown run ${runId}`);
    await store.saveReport(runId, renderReport(snap));
    await store.event(runId, { type: "report.written", agent: "report" });
    await store.setStatus(runId, "done");
    await store.expire(runId);
    log(`${runId} report ready`);
  };

  const opts = (n: number) => ({ connection: deps.connection, prefix: queuePrefix, concurrency: n });
  const workers = [
    new Worker("research", research, opts(1)),
    new Worker("writer", writer, opts(concurrency)),
    new Worker("reviewer", reviewer, opts(concurrency)),
    new Worker("report", report, opts(1)),
  ];
  for (const w of workers) w.on("error", (err) => log(`worker ${w.name}: ${errorMessage(err)}`));

  return {
    close: async () => {
      await Promise.all(workers.map((w) => w.close()));
    },
  };
}
