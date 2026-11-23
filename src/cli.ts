#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Redis } from "ioredis";
import type { Effort } from "./model/anthropic.js";
import { demoFaults, type FaultPlan } from "./model/mock.js";
import type { ResearchRequest } from "./protocol.js";
import { Queues } from "./pipeline/queues.js";
import { startRun, waitForRun, type RunOptions } from "./pipeline/runs.js";
import { RunStore } from "./pipeline/store.js";
import { startWorkers } from "./pipeline/workers.js";
import { renderReport } from "./report.js";
import { CandidateProfile, SearchCriteria } from "./schemas.js";

const usage = `Usage: pipeline <command> [options]

Commands
  run       Start a run and wait for its report
  worker    Run the agent workers (for a separate worker process)
  status    Show a run's status:            pipeline status <run-id>
  report    Print or save a run's report:   pipeline report <run-id> [--out file] [--render]
            (--render rebuilds it from the event log instead of using the stored copy)
  stop      Cancel a run:                   pipeline stop <run-id>
  list      Show recent runs

run options
  --profile <file>        Candidate profile JSON (required)
  --criteria <file>       Search criteria JSON (required)
  --source <src>          fixture:<file> or himalayas (default: himalayas)
  --model <id>            Claude model id, "ollama:<name>" for a local model, or "mock" (default: claude-opus-5-5)
  --effort <level>        low | medium | high | xhigh | max (default: medium)
  --faults <plan>         Mock only: "demo" or a JSON fault plan
  --time-limit <dur>      Stop the run after this long, e.g. 90s, 10m (default: 10m)
  --token-budget <n>      Stop starting new steps after this many tokens (default: 400000)
  --max-revisions <n>     Writer/reviewer rounds per job (default: 2)
  --max-repairs <n>       Repair rounds for invalid output, per step (default: 2)
  --attempts <n>          Queue deliveries per step for transient errors (default: 3)
  --backoff <dur>         First retry delay, doubled each time (default: 2s)
  --step-timeout <dur>    Time limit for one step, repair rounds included (default: 3m)
  --run-id <id>           Use this id instead of a generated one
  --out <dir>             Where to save the report (default: runs)
  --concurrency <n>       Writer and reviewer steps run at once (default: 4; use 1 for a local model)
  --no-workers            Only enqueue; let a separate "pipeline worker" process do the work

Environment
  REDIS_URL               default redis://127.0.0.1:6379
  ANTHROPIC_API_KEY       needed for Claude models
`;

function parseDuration(s: string): number {
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(s.trim());
  if (!m) throw new Error(`can't read duration "${s}"`);
  const unit = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[(m[2] ?? "ms") as "ms" | "s" | "m" | "h"];
  return Math.round(Number(m[1]) * unit);
}

const readJSON = async (path: string) => JSON.parse(await readFile(path, "utf8"));

function connect(): Redis {
  // BullMQ workers need maxRetriesPerRequest: null so blocking calls wait out reconnects.
  return new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
}

const log = (line: string) => console.error(`[${new Date().toISOString().slice(11, 23)}] ${line}`);

async function run(argv: string[]) {
  const { values: v } = parseArgs({
    args: argv,
    options: {
      profile: { type: "string" },
      criteria: { type: "string" },
      source: { type: "string", default: "himalayas" },
      model: { type: "string", default: "claude-opus-5-5" },
      effort: { type: "string", default: "medium" },
      faults: { type: "string" },
      "mock-latency": { type: "string", default: "40ms" },
      "time-limit": { type: "string", default: "10m" },
      "token-budget": { type: "string", default: "400000" },
      "max-revisions": { type: "string", default: "2" },
      "max-repairs": { type: "string", default: "2" },
      attempts: { type: "string", default: "3" },
      backoff: { type: "string", default: "2s" },
      "step-timeout": { type: "string", default: "3m" },
      "run-id": { type: "string" },
      out: { type: "string", default: "runs" },
      "no-workers": { type: "boolean", default: false },
      concurrency: { type: "string", default: "4" },
    },
  });
  if (!v.profile || !v.criteria) throw new Error("run needs --profile and --criteria");
  if (v.model !== "mock" && !v.model.startsWith("ollama:") && !process.env.ANTHROPIC_API_KEY) {
    throw new Error(`--model ${v.model} needs ANTHROPIC_API_KEY; use --model mock or --model ollama:<name> to run without one`);
  }
  if (v.faults && v.model !== "mock") throw new Error("--faults only works with --model mock");

  const request: ResearchRequest = {
    profile: CandidateProfile.parse(await readJSON(v.profile)),
    criteria: SearchCriteria.parse(await readJSON(v.criteria)),
  };
  const faults: FaultPlan | undefined = v.faults === "demo" ? demoFaults : v.faults ? JSON.parse(v.faults) : undefined;
  const options: RunOptions = {
    model: v.model,
    effort: v.effort as Effort,
    faults,
    mockLatencyMs: v.model === "mock" ? parseDuration(v["mock-latency"]) : undefined,
    source: v.source,
    timeLimitMs: parseDuration(v["time-limit"]),
    tokenBudget: Number(v["token-budget"]),
    maxRevisions: Number(v["max-revisions"]),
    maxRepairs: Number(v["max-repairs"]),
    stepTimeoutMs: parseDuration(v["step-timeout"]),
    queueAttempts: Number(v.attempts),
    backoffMs: parseDuration(v.backoff),
  };

  const redis = connect();
  const store = new RunStore(redis);
  const queues = new Queues(redis, store);
  const workers = v["no-workers"] ? null : startWorkers({ connection: redis, store, queues, log, concurrency: Number(v.concurrency) });
  try {
    const { id, config } = await startRun(store, queues, request, options, v["run-id"]);
    log(`${id}: started`);
    if (v["no-workers"]) {
      console.log(id);
      return;
    }
    const r = await waitForRun(store, id, config.timeLimitMs + 60_000, (line) => log(`${id}: ${line}`));
    const md = (await store.report(id))!;
    await mkdir(v.out, { recursive: true });
    const path = join(v.out, `${id}.md`);
    await writeFile(path, md);
    const results = await store.results(id);
    console.log(`${id}: ${results.map((x) => `#${x.rank} ${x.status}`).join(", ") || "no jobs selected"}${r.stopReason ? ` (stopped: ${r.stopReason})` : ""}`);
    console.log(`report: ${path}`);
  } finally {
    await workers?.close();
    await queues.close();
    redis.disconnect();
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "run":
      return run(rest);
    case "worker": {
      const { values } = parseArgs({ args: rest, options: { concurrency: { type: "string", default: "4" } } });
      const redis = connect();
      const store = new RunStore(redis);
      const queues = new Queues(redis, store);
      const workers = startWorkers({ connection: redis, store, queues, log, concurrency: Number(values.concurrency) });
      log("workers running; Ctrl-C to stop");
      const shutdown = async () => {
        log("shutting down");
        await workers.close();
        await queues.close();
        redis.disconnect();
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
      return;
    }
    case "status":
    case "report":
    case "stop":
    case "list": {
      const { values, positionals } = parseArgs({
        args: rest,
        allowPositionals: true,
        options: { out: { type: "string" }, render: { type: "boolean", default: false } },
      });
      const redis = connect();
      const store = new RunStore(redis);
      try {
        if (cmd === "list") {
          for (const id of await store.list()) {
            const r = await store.get(id);
            console.log(`${id}  ${r?.status ?? "expired"}  ${r?.config.model ?? ""}`);
          }
          return;
        }
        const id = positionals[0];
        if (!id) throw new Error(`${cmd} needs a run id`);
        const r = await store.get(id);
        if (!r) throw new Error(`no run ${id}`);
        if (cmd === "stop") {
          await store.cancel(id);
          console.log(`${id}: cancel requested; steps not yet started will stop`);
        } else if (cmd === "status") {
          const results = await store.results(id);
          console.log(JSON.stringify({ id, status: r.status, tokens: r.tokens, stopReason: r.stopReason, pending: await store.pending(id), results: results.map((x) => ({ job: x.jobId, status: x.status, revisions: x.revisions })) }, null, 2));
        } else {
          const snap = values.render ? await store.snapshot(id) : null;
          const md = snap ? renderReport(snap) : await store.report(id);
          if (!md) throw new Error(`run ${id} has no report yet (status ${r.status})`);
          if (values.out) await writeFile(values.out, md);
          else process.stdout.write(md);
        }
      } finally {
        redis.disconnect();
      }
      return;
    }
    default:
      process.stdout.write(usage);
      if (cmd && cmd !== "help" && cmd !== "--help") process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
