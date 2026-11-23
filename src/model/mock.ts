// A deterministic stand-in for the model, for tests, CI and offline demos.
// It reads the structured input behind each prompt and builds its answer
// with simple rules (keyword overlap for research, a template for the
// writer, fixed checks for the reviewer). It is not a language model. It
// exists so the queueing, validation and recovery code can run end to end
// without an API key, and its output is always labelled "mock" in reports.
//
// A fault plan makes it misbehave in specific, repeatable ways, so the
// failure paths run in the demo and in tests.
import type { ReviewRequest, WriteRequest } from "../protocol.js";
import type { ResearchOutput, ReviewOutput, WriterOutput } from "../schemas.js";
import type { ResearchInput } from "../agents/research.js";
import type { ModelClient, ModelRequest, ModelResponse } from "./client.js";

export interface FaultPlan {
  /** The writer's first draft for this rank cites evidence that isn't in the profile. The repair round fixes it. */
  unsupportedClaim?: number;
  /** The reviewer asks for one revision of this rank's first draft. */
  reviseOnce?: number;
  /** The reviewer call for this rank fails with an overload error on its first queue delivery. */
  transientError?: number;
  /** The writer never produces valid output for this rank, so the job fails. */
  alwaysInvalid?: number;
}

export const demoFaults: FaultPlan = { unsupportedClaim: 1, reviseOnce: 1, transientError: 2, alwaysInvalid: 3 };

/** Mimics the API's 529 response. Not a PermanentError, so the queue retries it. */
export class MockOverloadedError extends Error {
  readonly status = 529;
  constructor() {
    super("mock: 529 overloaded");
    this.name = "MockOverloadedError";
  }
}

const estimateTokens = (s: string) => Math.ceil(s.length / 4);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });
}

export class MockModel implements ModelClient {
  readonly name = "mock";

  constructor(private opts: { faults?: FaultPlan; latencyMs?: number } = {}) {}

  async generate(req: ModelRequest): Promise<ModelResponse> {
    await sleep(this.opts.latencyMs ?? 0, req.signal);
    let out: { text: string; stopReason?: string };
    switch (req.agent) {
      case "research":
        out = { text: JSON.stringify(research(req.input as ResearchInput)) };
        break;
      case "writer":
        out = this.write(req.input as WriteRequest, req);
        break;
      case "reviewer":
        out = { text: JSON.stringify(this.review(req.input as ReviewRequest, req)) };
        break;
      default:
        throw new Error(`mock: no behaviour for agent ${req.agent}`);
    }
    const prompt = req.system + req.turns.map((t) => t.content).join("");
    return {
      text: out.text,
      model: this.name,
      stopReason: out.stopReason ?? "end_turn",
      usage: { inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(out.text), cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }

  private write(w: WriteRequest, req: ModelRequest): { text: string; stopReason?: string } {
    const f = this.opts.faults ?? {};
    const draft = writeDraft(w);
    if (f.alwaysInvalid === w.rank) {
      if (req.repairRound === 0) {
        // Ran out of tokens mid-object.
        return { text: JSON.stringify(draft).slice(0, 240), stopReason: "max_tokens" };
      }
      return {
        text: JSON.stringify({
          ...draft,
          cover_letter: `Dear [Hiring Manager],\n\nI am excited to apply for the [Role] position at ${w.job.company}. I believe my skills make me a great fit and I would love to discuss the role further.\n\nBest regards,\n${w.profile.name}`,
        }),
      };
    }
    if (f.unsupportedClaim === w.rank && req.meta.revision === 0 && req.repairRound === 0) {
      const invented = "I also led a 15-person ML platform team at a Fortune 500 retailer, shipping models to 40 million users.";
      const parts = draft.cover_letter.split("\n\n");
      parts.splice(2, 0, invented);
      return {
        text: JSON.stringify({
          ...draft,
          cover_letter: parts.join("\n\n"),
          claims: [...draft.claims, { claim: "Led a 15-person ML platform team", evidence: "Led a 15-person ML platform team at a Fortune 500 retailer" }],
        }),
      };
    }
    return { text: JSON.stringify(draft) };
  }

  private review(r: ReviewRequest, req: ModelRequest): ReviewOutput {
    const f = this.opts.faults ?? {};
    if (f.transientError === r.rank && req.meta.queueAttempt === 0) throw new MockOverloadedError();
    if (f.reviseOnce === r.rank && req.meta.revision === 0) {
      return {
        job_id: r.job.id,
        verdict: "revise",
        score: 6,
        issues: [
          {
            severity: "major",
            issue: `The letter never says why ${r.job.company} in particular; with the name swapped it could go to any employer.`,
            fix: `Add one sentence tied to something specific in the ${r.job.company} posting.`,
          },
        ],
        unsupported_claims: [],
      };
    }
    const mentionsCompany = r.draft.cover_letter.split(r.job.company).length > 2; // beyond the greeting
    return {
      job_id: r.job.id,
      verdict: "approve",
      score: mentionsCompany ? 9 : 8,
      issues: mentionsCompany ? [] : [{ severity: "minor", issue: "The company is named only in the greeting.", fix: "Mention it once in the body." }],
      unsupported_claims: [],
    };
  }
}

// --- research: keyword overlap -------------------------------------------

const openEverywhere = ["worldwide", "anywhere", "global"];
const asiaRegions = ["apac", "asia"];

function mentions(text: string, term: string): boolean {
  const t = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(text);
}

const usd = (x: number) => x.toLocaleString("en-US");

function research({ profile, criteria, jobs }: ResearchInput): ResearchOutput {
  const region = criteria.must_be_open_to.toLowerCase();
  const scored = jobs.map((job) => {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const kw = criteria.keywords.filter((k) => mentions(text, k));
    const skills = profile.skills.filter((s) => mentions(text, s));
    const score = Math.round(100 * (0.6 * (kw.length / criteria.keywords.length) + 0.4 * Math.min(1, skills.length / 5)));
    const loc = job.location.toLowerCase();
    // Whole words only: "Malaysia" contains "asia" but doesn't open a job to Thailand.
    const open = [...openEverywhere, region, ...asiaRegions].some((w) => mentions(loc, w));
    let reject: string | null = null;
    if (job.salary_monthly_usd !== null && job.salary_monthly_usd < criteria.min_monthly_usd) {
      reject = `Pays $${usd(job.salary_monthly_usd)}/month, below the $${usd(criteria.min_monthly_usd)} floor.`;
    } else if (!open) {
      const where = job.location.length > 60 ? `${job.location.slice(0, 57)}...` : job.location;
      reject = `Not open to candidates in ${criteria.must_be_open_to} (location: ${where}).`;
    } else if (score < 40) {
      reject = `Weak match (score ${score}): the posting shares few of the candidate's keywords and skills.`;
    }
    return { job, kw, skills, score, reject };
  });

  const passing = scored.filter((s) => !s.reject).sort((a, b) => b.score - a.score);
  const selected = passing.slice(0, criteria.max_jobs);
  const overflow = passing.slice(criteria.max_jobs);
  return {
    selected: selected.map((s) => ({
      job_id: s.job.id,
      match_score: s.score,
      why_match: `Mentions ${[...new Set([...s.kw, ...s.skills])].join(", ")}.`,
      key_requirements: [...new Set([...s.kw, ...s.skills])].slice(0, 5),
      concerns: s.job.salary_monthly_usd === null ? ["salary not listed"] : [],
    })),
    rejected: [
      ...scored.filter((s) => s.reject).map((s) => ({ job_id: s.job.id, reason: s.reject! })),
      ...overflow.map((s) => ({ job_id: s.job.id, reason: `Passed the filters but scored ${s.score}, below the ${criteria.max_jobs} selected jobs.` })),
    ],
  };
}

// --- writer: a template filled with profile facts --------------------------

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const listify = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

function firstSentence(s: string): string {
  const m = /^(.+?[.!?])(\s|$)/s.exec(s.trim());
  return (m?.[1] ?? s).trim();
}

function writeDraft(w: WriteRequest): WriterOutput {
  const { profile, job, research: notes } = w;
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  // The highlights that mention the most of the job's terms, in profile order on ties.
  const highlights = profile.experience
    .flatMap((e) => e.highlights.map((h) => ({ e, h, hits: profile.skills.filter((s) => mentions(jobText, s) && mentions(h.toLowerCase(), s)).length })))
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .slice(0, 3);
  const project = profile.projects[0];

  // One paragraph per employer, in the order the employers first appear.
  const byCompany = new Map<string, typeof highlights>();
  for (const x of highlights) byCompany.set(x.e.company, [...(byCompany.get(x.e.company) ?? []), x]);
  const paragraphs = [
    `Dear ${job.company} team,`,
    `I'm applying for the ${job.title} role. I'm a ${lowerFirst(profile.headline)}, and your posting asks for ${listify(notes.key_requirements.slice(0, 3))}, which matches the work I have been doing.`,
    ...[...byCompany.values()].map((xs) =>
      xs.map(({ e, h }, i) => (i === 0 ? `At ${e.company}, as ${e.role}, I ${lowerFirst(h)}` : `I also ${lowerFirst(h)}`)).join(" "),
    ),
  ];
  const skills = profile.skills.filter((s) => mentions(jobText, s)).slice(0, 4);
  if (skills.length) paragraphs.push(`Day to day I work in ${listify(skills)}, which overlaps with the stack in your posting.`);
  if (project) paragraphs.push(`Outside of work I built ${project.name}: ${lowerFirst(project.summary)}`);
  if (w.feedback?.issues.length) {
    paragraphs.push(`What draws me to ${job.company} is this line from your posting: "${firstSentence(job.description)}" That is the kind of problem I want to work on next.`);
  }
  paragraphs.push(
    `I'm based in ${profile.location} and work remotely. I'd welcome a short call to walk through any of this work in more detail. Thank you for your time.\n\n${profile.name}`,
  );

  return {
    job_id: job.id,
    cover_letter: paragraphs.join("\n\n"),
    resume_bullets: highlights.map(({ h }) => h).concat(project ? [`${project.name}: ${project.summary}`] : []).slice(0, 5),
    claims: [
      { claim: `Is a ${lowerFirst(profile.headline)}`, evidence: profile.headline },
      ...highlights.map(({ e, h }) => ({ claim: `${h.replace(/\.$/, "").split(", ")[0]} (${e.company})`, evidence: h })),
      ...skills.map((s) => ({ claim: `Works with ${s}`, evidence: s })),
      ...(project ? [{ claim: `Built ${project.name}`, evidence: project.summary }] : []),
      { claim: `Based in ${profile.location}`, evidence: profile.location },
    ],
  };
}
