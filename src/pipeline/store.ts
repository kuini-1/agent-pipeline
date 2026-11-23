// Run state in Redis. Everything the report needs lives under ap:run:<id>.
//
//   ap:run:<id>           hash    config, request, status, timestamps, token count, stop reason
//   ap:run:<id>:events    list    append-only event log (the run history)
//   ap:run:<id>:jobs      string  the postings the research step fetched
//   ap:run:<id>:research  string  the research agent's validated output (checkpoint)
//   ap:run:<id>:pending   string  fan-in counter: jobs still in flight
//   ap:run:<id>:results   hash    job id -> terminal JobResult
//   ap:run:<id>:sent      set     envelope ids already sent (keeps the log free of duplicate sends)
//   ap:run:<id>:report    string  the rendered Markdown report
//   ap:runs               zset    run ids by creation time
import type { Redis, Result } from "ioredis";
import type { FaultPlan } from "../model/mock.js";
import type { Effort } from "../model/anthropic.js";
import type { Usage } from "../model/client.js";
import type { AgentName, JobResult, ResearchRequest } from "../protocol.js";
import type { JobPosting, ResearchOutput } from "../schemas.js";

export interface RunConfig {
  model: string; // "mock" or a Claude model id
  effort: Effort;
  faults?: FaultPlan; // mock only
  mockLatencyMs?: number;
  source: string;
  timeLimitMs: number;
  deadlineAt: number; // epoch ms
  tokenBudget: number;
  maxRevisions: number;
  maxRepairs: number;
  stepTimeoutMs: number;
  queueAttempts: number;
  backoffMs: number;
}

export type RunStatus = "running" | "reporting" | "done";

export interface RunRecord {
  id: string;
  createdAt: number;
  finishedAt?: number;
  status: RunStatus;
  tokens: number;
  stopReason?: string;
  config: RunConfig;
  request: ResearchRequest;
}

export type EventType =
  | "run.created"
  | "message.sent"
  | "step.started"
  | "attempt"
  | "step.done"
  | "step.retry"
  | "step.failed"
  | "step.stopped"
  | "source.loaded"
  | "job.finished"
  | "report.written";

export interface RunEvent {
  at: number;
  type: EventType;
  agent?: AgentName | "client";
  to?: AgentName;
  jobRef?: string;
  revision?: number;
  queueAttempt?: number;
  round?: number;
  ok?: boolean;
  errors?: string[];
  model?: string;
  tokens?: number;
  usage?: Usage;
  ms?: number;
  detail?: string;
}

export interface RunSnapshot {
  run: RunRecord;
  events: RunEvent[];
  jobs: JobPosting[];
  research: ResearchOutput | null;
  results: JobResult[];
}

// Record a job's result and decrement the fan-in counter in one step, once.
// Returns the remaining count, or -1 if this job already had a result (a
// redelivered message), so a retry can never count a job twice.
const finishJobLua = `
if redis.call('HSETNX', KEYS[1], ARGV[1], ARGV[2]) == 1 then
  return redis.call('DECR', KEYS[2])
end
return -1`;

declare module "ioredis" {
  interface RedisCommander<Context> {
    apFinishJob(resultsKey: string, pendingKey: string, jobId: string, result: string): Result<number, Context>;
  }
}

const retentionSeconds = 7 * 24 * 3600;

export class RunStore {
  constructor(private redis: Redis) {
    redis.defineCommand("apFinishJob", { numberOfKeys: 2, lua: finishJobLua });
  }

  private key = (id: string, part?: string) => (part ? `ap:run:${id}:${part}` : `ap:run:${id}`);

  async create(run: RunRecord): Promise<void> {
    const ok = await this.redis.hsetnx(this.key(run.id), "config", JSON.stringify(run.config));
    if (!ok) throw new Error(`run ${run.id} already exists`);
    await this.redis
      .multi()
      .hset(this.key(run.id), {
        request: JSON.stringify(run.request),
        status: run.status,
        createdAt: run.createdAt,
        tokens: 0,
      })
      .zadd("ap:runs", run.createdAt, run.id)
      .exec();
  }

  async get(id: string): Promise<RunRecord | null> {
    const h = await this.redis.hgetall(this.key(id));
    if (!h.config || !h.request) return null;
    return {
      id,
      createdAt: Number(h.createdAt),
      finishedAt: h.finishedAt ? Number(h.finishedAt) : undefined,
      status: (h.status ?? "running") as RunStatus,
      tokens: Number(h.tokens ?? 0),
      stopReason: h.stopReason || undefined,
      config: JSON.parse(h.config),
      request: JSON.parse(h.request),
    };
  }

  async list(limit = 20): Promise<string[]> {
    return this.redis.zrevrange("ap:runs", 0, limit - 1);
  }

  async event(id: string, e: Omit<RunEvent, "at">): Promise<void> {
    await this.redis.rpush(this.key(id, "events"), JSON.stringify({ at: Date.now(), ...e }));
  }

  async addTokens(id: string, n: number): Promise<number> {
    return this.redis.hincrby(this.key(id), "tokens", n);
  }

  async cancel(id: string): Promise<void> {
    await this.redis.hset(this.key(id), "cancelled", "1");
  }

  /**
   * The stop rules, checked before every step. The first reason found is
   * kept as the run's stop reason. A step already running when a limit is
   * crossed finishes (its call has its own timeout), so the token budget can
   * be overshot by at most one step.
   */
  async stopReason(run: RunRecord): Promise<string | null> {
    const [cancelled, tokens] = await this.redis.hmget(this.key(run.id), "cancelled", "tokens");
    let reason: string | null = null;
    if (cancelled) reason = "cancelled";
    else if (Date.now() >= run.config.deadlineAt) reason = `time limit reached (${run.config.timeLimitMs < 1000 ? `${run.config.timeLimitMs} ms` : `${Math.round(run.config.timeLimitMs / 1000)} s`})`;
    else if (Number(tokens ?? 0) >= run.config.tokenBudget) reason = `token budget used (${tokens} of ${run.config.tokenBudget})`;
    if (reason) await this.redis.hsetnx(this.key(run.id), "stopReason", reason);
    return reason;
  }

  async saveJobs(id: string, jobs: JobPosting[]): Promise<void> {
    await this.redis.set(this.key(id, "jobs"), JSON.stringify(jobs));
  }

  async jobs(id: string): Promise<JobPosting[]> {
    const s = await this.redis.get(this.key(id, "jobs"));
    return s ? JSON.parse(s) : [];
  }

  /** True the first time an envelope id is seen for this run. */
  async markSent(id: string, envelopeId: string): Promise<boolean> {
    return (await this.redis.sadd(this.key(id, "sent"), envelopeId)) === 1;
  }

  /** Saves the research output once; returns whichever output was saved first. */
  async checkpointResearch(id: string, out: ResearchOutput): Promise<ResearchOutput> {
    await this.redis.set(this.key(id, "research"), JSON.stringify(out), "NX");
    return (await this.research(id))!;
  }

  async research(id: string): Promise<ResearchOutput | null> {
    const s = await this.redis.get(this.key(id, "research"));
    return s ? JSON.parse(s) : null;
  }

  /** Sets the fan-in counter once. A redelivered research step leaves it alone. */
  async setPending(id: string, n: number): Promise<void> {
    await this.redis.set(this.key(id, "pending"), n, "NX");
  }

  async pending(id: string): Promise<number | null> {
    const s = await this.redis.get(this.key(id, "pending"));
    return s === null ? null : Number(s);
  }

  /** Records a job's terminal result. Returns true when this was the last job in flight. */
  async finishJob(id: string, result: JobResult, agent?: AgentName): Promise<boolean> {
    const left = await this.redis.apFinishJob(this.key(id, "results"), this.key(id, "pending"), result.jobId, JSON.stringify(result));
    if (left >= 0) {
      await this.event(id, { type: "job.finished", agent, jobRef: result.jobId, revision: result.revisions, detail: result.status + (result.reason ? `: ${result.reason}` : "") });
    }
    // -1 means a redelivery. If the counter is already at zero, the first
    // delivery may have died before handing off to the report, so say yes
    // again; the report message's id makes the second enqueue a no-op.
    return left === 0 || (left === -1 && (await this.pending(id)) === 0);
  }

  async results(id: string): Promise<JobResult[]> {
    const h = await this.redis.hgetall(this.key(id, "results"));
    return Object.values(h)
      .map((s) => JSON.parse(s) as JobResult)
      .sort((a, b) => a.rank - b.rank);
  }

  async setStatus(id: string, status: RunStatus): Promise<void> {
    await this.redis.hset(this.key(id), "status", status);
    if (status === "reporting") await this.redis.hsetnx(this.key(id), "finishedAt", Date.now());
  }

  async saveReport(id: string, markdown: string): Promise<void> {
    await this.redis.set(this.key(id, "report"), markdown);
  }

  async report(id: string): Promise<string | null> {
    return this.redis.get(this.key(id, "report"));
  }

  async snapshot(id: string): Promise<RunSnapshot | null> {
    const run = await this.get(id);
    if (!run) return null;
    const [events, jobs, research, results] = await Promise.all([
      this.redis.lrange(this.key(id, "events"), 0, -1),
      this.jobs(id),
      this.research(id),
      this.results(id),
    ]);
    return { run, events: events.map((e) => JSON.parse(e)), jobs, research, results };
  }

  /** Lets finished runs expire after a week. */
  async expire(id: string): Promise<void> {
    const m = this.redis.multi();
    for (const part of [undefined, "events", "jobs", "research", "pending", "results", "sent", "report"]) m.expire(this.key(id, part), retentionSeconds);
    await m.exec();
  }
}
