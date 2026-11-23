// Renders a run's full history as Markdown: outcome, the research decisions,
// each application with its review, every failure and how it was handled,
// and the event timeline. Everything comes from the run's state in Redis.
import { costUSD } from "./model/pricing.js";
import type { RunEvent, RunSnapshot } from "./pipeline/store.js";
import type { JobResult } from "./protocol.js";
import type { JobPosting } from "./schemas.js";

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const n = (x: number) => x.toLocaleString("en-US");
const quote = (s: string) =>
  s
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");

function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 120_000) return `${(ms / 1000).toFixed(1)} s`;
  const s = Math.round((ms % 60_000) / 1000);
  return `${Math.floor(ms / 60_000)} min${s ? ` ${s} s` : ""}`;
}

const statusText: Record<JobResult["status"], string> = {
  approved: "approved",
  gave_up: "gave up",
  failed: "failed",
  stopped: "stopped",
};

function salary(j: JobPosting): string {
  return j.salary_monthly_usd === null ? "not listed" : `$${n(j.salary_monthly_usd)}/month`;
}

function describeEvent(e: RunEvent, restarted = false): string {
  switch (e.type) {
    case "message.sent":
      return `sent to ${e.to}${e.revision ? ` (revision ${e.revision})` : ""}`;
    case "step.started":
      if (restarted) return "started again: the worker running it stopped before finishing";
      return e.queueAttempt ? `started (delivery ${e.queueAttempt + 1})` : "started";
    case "attempt": {
      const head = e.round === 0 ? "model call" : `repair round ${e.round}`;
      const stats = `${n(e.tokens ?? 0)} tokens, ${e.ms} ms`;
      return e.ok ? `${head}: valid (${stats})` : `${head}: invalid, ${e.errors?.length ?? 0} error(s) (${stats})`;
    }
    case "step.retry":
      return `error, will retry: ${e.detail}`;
    case "step.failed":
      return `failed: ${e.detail}`;
    case "step.stopped":
      return `stopped: ${e.detail}`;
    default:
      return e.detail ?? "";
  }
}

export function renderReport(s: RunSnapshot): string {
  const { run, events, jobs, research, results } = s;
  const c = run.config;
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const selected = new Map((research?.selected ?? []).map((x) => [x.job_id, x]));
  const attempts = events.filter((e) => e.type === "attempt");
  const mock = c.model === "mock";
  // A step that starts twice with the same delivery number was picked up
  // again after the worker holding it died: BullMQ's stalled-job check puts
  // a job back on the queue once its lock expires.
  const restarted = new Set<RunEvent>();
  const starts = new Set<string>();
  for (const e of events) {
    if (e.type !== "step.started") continue;
    const k = `${e.agent}|${e.jobRef}|${e.revision}|${e.queueAttempt}`;
    if (starts.has(k)) restarted.add(e);
    starts.add(k);
  }
  const out: string[] = [];

  out.push(`# Run report: \`${run.id}\``, "");
  if (mock) {
    out.push(
      "> Produced with the deterministic **mock model**: rule-based output, no API calls, and token counts estimated as characters / 4. It shows how the pipeline behaves, not the quality of a real model's writing.",
    );
    if (c.faults && Object.keys(c.faults).length) {
      const f = Object.entries(c.faults)
        .map(([k, v]) => `\`${k}\` on job #${v}`)
        .join(", ");
      out.push(">", `> Fault injection was on (${f}), so the failures below were planned, to exercise the recovery paths.`);
    }
    out.push("");
  }

  // --- summary
  let cost = 0;
  let priced = false;
  for (const a of attempts) {
    const usd = a.usage && a.model ? costUSD(a.model, a.usage) : null;
    if (usd !== null) {
      cost += usd;
      priced = true;
    }
  }
  const models = [...new Set(attempts.map((a) => a.model).filter(Boolean))];
  const finished = run.finishedAt ?? Date.now();
  const counts = Object.entries(
    results.reduce<Record<string, number>>((acc, r) => ((acc[statusText[r.status]] = (acc[statusText[r.status]] ?? 0) + 1), acc), {}),
  )
    .map(([k, v]) => `${v} ${k}`)
    .join(", ");

  out.push("| | |", "|---|---|");
  out.push(`| Status | ${run.stopReason ? `stopped early: ${run.stopReason}` : "finished"} |`);
  out.push(`| Model | \`${c.model}\`${mock ? "" : ` (effort ${c.effort})`}${models.length && !models.every((m) => m === c.model) ? `; served by ${models.map((m) => `\`${m}\``).join(", ")}` : ""} |`);
  out.push(`| Job source | \`${c.source}\` (${jobs.length} postings) |`);
  out.push(`| Started | ${new Date(run.createdAt).toISOString()} |`);
  out.push(`| Duration | ${duration(finished - run.createdAt)} |`);
  out.push(`| Model calls | ${attempts.length} (${attempts.filter((a) => !a.ok).length} returned invalid output) |`);
  out.push(`| Tokens | ${n(run.tokens)}${mock ? " (estimated)" : ""} |`);
  out.push(`| Cost | ${priced ? `$${cost.toFixed(4)} at list prices` : "none (mock model)"} |`);
  out.push(
    `| Limits | ${duration(c.timeLimitMs)} per run, ${n(c.tokenBudget)} tokens, ${c.maxRevisions} revisions per job, ${c.maxRepairs} repair rounds per step, ${c.queueAttempts} deliveries per step |`,
  );
  out.push("");

  // --- outcome
  out.push("## Outcome", "");
  if (!research) {
    out.push("The research step did not finish, so no jobs were selected.", "");
  } else {
    out.push(`${results.length} of ${jobs.length} postings selected${counts ? `: ${counts}` : ""}.`, "");
  }
  if (results.length) {
    out.push("| # | Job | Company | Match | Result | Revisions | Review |", "|---|---|---|---|---|---|---|");
    for (const r of results) {
      const j = byId.get(r.jobId);
      const title = j ? `[${cell(j.title)}](${j.url})` : r.jobId;
      const review = r.review ? `${r.review.score}/10, ${r.review.verdict}` : "-";
      out.push(`| ${r.rank} | ${title} | ${cell(j?.company ?? "")} | ${selected.get(r.jobId)?.match_score ?? "-"} | ${statusText[r.status]} | ${r.revisions} | ${review} |`);
    }
    out.push("");
  }

  // --- search
  const { profile, criteria } = run.request;
  out.push("## Search", "");
  out.push(`- Candidate: ${profile.name}, ${profile.headline} (${profile.location})`);
  out.push(`- Keywords: ${criteria.keywords.join(", ")}`);
  out.push(`- Salary floor: $${n(criteria.min_monthly_usd)}/month; must be open to ${criteria.must_be_open_to}; up to ${criteria.max_jobs} jobs`);
  out.push("");
  if (research) {
    out.push("### Selected", "", "| Job | Score | Why | Concerns |", "|---|---|---|---|");
    for (const x of [...research.selected].sort((a, b) => b.match_score - a.match_score)) {
      const j = byId.get(x.job_id);
      out.push(`| ${cell(j ? `${j.title}, ${j.company}` : x.job_id)} | ${x.match_score} | ${cell(x.why_match)} | ${cell(x.concerns.join("; ") || "-")} |`);
    }
    out.push("", "### Rejected", "", "| Job | Reason |", "|---|---|");
    for (const x of research.rejected) {
      const j = byId.get(x.job_id);
      out.push(`| ${cell(j ? `${j.title}, ${j.company}` : x.job_id)} | ${cell(x.reason)} |`);
    }
    out.push("");
  }

  // --- applications
  if (results.length) out.push("## Applications", "");
  for (const r of results) {
    const j = byId.get(r.jobId);
    out.push(`### ${r.rank}. ${j?.title ?? r.jobId}, ${j?.company ?? ""} (${statusText[r.status]})`, "");
    if (j) out.push(`[Posting](${j.url}) · ${j.location} · salary ${salary(j)}`, "");
    const notes = selected.get(r.jobId);
    if (notes) {
      out.push(`**Why it matched:** ${notes.why_match}`);
      if (notes.concerns.length) out.push(`**Concerns:** ${notes.concerns.join("; ")}`);
      out.push("");
    }
    if (r.reason) out.push(`**Why it ended here:** ${r.reason}`, "");

    const shown = new Set(["attempt", "step.done", "step.retry", "step.failed", "step.stopped"]);
    const path = events.filter((e) => e.jobRef === r.jobId && (shown.has(e.type) || restarted.has(e)));
    if (path.length) {
      out.push("**Path:**", "");
      for (const e of path) out.push(`- ${e.agent}, revision ${e.revision}: ${describeEvent(e, restarted.has(e))}`);
      out.push("");
    }

    if (r.draft) {
      if (r.status !== "approved") out.push("_Last draft that passed validation:_", "");
      out.push("**Cover letter**", "", quote(r.draft.cover_letter), "", "**Resume bullets**", "");
      for (const b of r.draft.resume_bullets) out.push(`- ${b}`);
      out.push("", "**Claims checked against the profile**", "", "| Claim | Evidence (verbatim from profile) |", "|---|---|");
      for (const cl of r.draft.claims) out.push(`| ${cell(cl.claim)} | ${cell(cl.evidence)} |`);
      out.push("");
    }
    if (r.review) {
      out.push(`**Review:** ${r.review.verdict}, ${r.review.score}/10`);
      for (const i of r.review.issues) out.push(`- ${i.severity}: ${i.issue} Fix: ${i.fix}`);
      for (const u of r.review.unsupported_claims) out.push(`- unsupported claim: "${u}"`);
      out.push("");
    }
  }

  // --- failures
  out.push("## Failures and recoveries", "");
  const problems = events.filter(
    (e) => (e.type === "attempt" && !e.ok) || restarted.has(e) || e.type === "step.retry" || e.type === "step.failed" || e.type === "step.stopped",
  );
  if (!problems.length) out.push("None.", "");
  for (const e of problems) {
    const where = `\`${e.agent}\`${e.jobRef ? ` on \`${e.jobRef}\`` : ""}, revision ${e.revision ?? 0}`;
    if (e.type === "attempt") {
      const next = e.round! < c.maxRepairs ? "sent back with the errors for a repair round" : "no repair rounds left, so the job failed";
      out.push(`- ${where}, ${e.round === 0 ? "first call" : `repair round ${e.round}`}: output failed validation; ${next}.`);
      for (const err of e.errors ?? []) out.push(`  - ${err}`);
    } else if (restarted.has(e)) {
      out.push(`- ${where}: the worker running this step stopped before it finished, so nothing was recorded. The queue gave the message to a worker again once its lock expired.`);
    } else if (e.type === "step.retry") {
      out.push(`- ${where}, delivery ${(e.queueAttempt ?? 0) + 1}: ${e.detail}. Retried by the queue with backoff.`);
    } else if (e.type === "step.failed") {
      out.push(`- ${where}: **failed** (${e.detail}). Recorded as the job's result; the other jobs carried on.`);
    } else {
      out.push(`- ${where}: stopped before calling the model (${e.detail}).`);
    }
  }
  if (problems.length) out.push("");

  // --- timeline
  out.push("## Timeline", "", "| Time | Agent | Job | Event |", "|---|---|---|---|");
  for (const e of events) {
    if (e.type === "report.written") continue;
    const t = `+${((e.at - run.createdAt) / 1000).toFixed(3)}s`;
    out.push(`| ${t} | ${e.agent ?? ""} | ${e.jobRef ?? ""} | ${cell(`${e.type === "run.created" ? "run created: " : ""}${describeEvent(e, restarted.has(e))}`)} |`);
  }
  out.push("");
  return out.join("\n");
}
