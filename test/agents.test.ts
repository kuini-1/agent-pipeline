import { describe, expect, it } from "vitest";
import { researchAgent } from "../src/agents/research.js";
import { reviewerAgent } from "../src/agents/reviewer.js";
import { profileFields, supported, writerAgent } from "../src/agents/writer.js";
import { normalize } from "../src/agents/agent.js";
import type { WriteRequest } from "../src/protocol.js";
import type { ResearchOutput, ReviewOutput, WriterOutput } from "../src/schemas.js";
import { criteria, jobs, profile } from "./helpers.js";

const job = jobs[0]!;
const notes = { job_id: job.id, match_score: 80, why_match: "x", key_requirements: ["RAG"], concerns: [] };
const writeReq: WriteRequest = { profile, job, research: notes, rank: 1 };

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const draft = (over: Partial<WriterOutput> = {}): WriterOutput => ({
  job_id: job.id,
  cover_letter: `Dear ${job.company} team,\n\n${words(200)}`,
  resume_bullets: ["a", "b", "c"],
  claims: [{ claim: "Works with Go", evidence: "Go" }],
  ...over,
});
const checkDraft = (d: WriterOutput) => writerAgent.check(writeReq)(d);

describe("writer check", () => {
  it("accepts a draft whose claims are backed by the profile", () => {
    expect(checkDraft(draft())).toEqual([]);
  });

  it("rejects evidence that is not in the profile", () => {
    const errs = checkDraft(draft({ claims: [{ claim: "Led a team", evidence: "Managed a team of 40 engineers" }] }));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^claims\[0\]\.evidence is not text from the profile/);
  });

  it("matches evidence across case, curly quotes and a trailing period", () => {
    const fields = profileFields(profile).map(normalize);
    const h = profile.experience[0]!.highlights[0]!;
    expect(supported(fields, h.toUpperCase().replace(/\.$/, ""))).toBe(true);
    expect(supported(fields, "Senior full‑stack engineer")).toBe(false); // a different hyphen is a different text
  });

  it("allows a short whole field but not a short fragment", () => {
    const fields = profileFields(profile).map(normalize);
    expect(supported(fields, "Go")).toBe(true);
    expect(supported(fields, "Built a")).toBe(false); // in a highlight, but too short to mean anything
  });

  it("enforces the word range and the number of bullets", () => {
    expect(checkDraft(draft({ cover_letter: words(100) }))[0]).toMatch(/has 100 words/);
    expect(checkDraft(draft({ cover_letter: words(400) }))[0]).toMatch(/has 400 words/);
    expect(checkDraft(draft({ resume_bullets: ["a"] }))[0]).toMatch(/resume_bullets has 1 items/);
  });

  it("catches placeholders and a wrong job id", () => {
    const errs = checkDraft(draft({ job_id: "other", cover_letter: `Dear [Hiring Manager],\n\n${words(200)}` }));
    expect(errs).toContain(`job_id is "other"; it must be "${job.id}"`);
    expect(errs).toContain('cover_letter contains a placeholder: "[Hiring Manager]"');
  });

  it("puts the previous draft and the feedback in a revision prompt", () => {
    const feedback: ReviewOutput = { job_id: job.id, verdict: "revise", score: 5, issues: [{ severity: "major", issue: "generic", fix: "be specific" }], unsupported_claims: [] };
    const first = writerAgent.prompt(writeReq);
    const revision = writerAgent.prompt({ ...writeReq, previous: draft(), feedback });
    expect(first).not.toContain("<previous_draft>");
    expect(revision).toContain("<previous_draft>");
    expect(revision).toContain("be specific");
  });
});

describe("research check", () => {
  const input = { profile, criteria, jobs };
  const check = researchAgent.check(input);
  const sel = (job_id: string, match_score = 70) => ({ job_id, match_score, why_match: "", key_requirements: [], concerns: [] });
  const full = (selected: string[]): ResearchOutput => ({
    selected: selected.map((id) => sel(id)),
    rejected: jobs.filter((j) => !selected.includes(j.id)).map((j) => ({ job_id: j.id, reason: "no" })),
  });

  it("accepts an output that accounts for every job once", () => {
    expect(check(full(["fx-quillstack-llm-platform"]))).toEqual([]);
  });

  it("catches unknown, duplicate and missing ids", () => {
    const out = full(["fx-quillstack-llm-platform"]);
    out.selected.push(sel("fx-made-up"));
    out.rejected.push({ job_id: "fx-quillstack-llm-platform", reason: "dup" });
    out.rejected = out.rejected.filter((r) => r.job_id !== "fx-meridian-data-analyst");
    const errs = check(out);
    expect(errs).toContain('job_id "fx-made-up" is not one of the input jobs');
    expect(errs.some((e) => e.startsWith('job_id "fx-quillstack-llm-platform" appears 2 times'))).toBe(true);
    expect(errs).toContain('job_id "fx-meridian-data-analyst" is missing; put it in selected or rejected');
  });

  it("enforces max_jobs and the salary floor even if the model ignores them", () => {
    const errs = check(full(["fx-quillstack-llm-platform", "fx-tidewater-retrieval", "fx-brightloop-applied-ai", "fx-copperleaf-ml-intern"]));
    expect(errs).toContain("selected has 4 jobs; the limit is 3");
    expect(errs.some((e) => e.includes("fx-copperleaf-ml-intern") && e.includes("below the $3000 floor"))).toBe(true);
  });
});

describe("reviewer check", () => {
  const check = reviewerAgent.check({ profile, job, research: notes, rank: 1, draft: draft() });
  const review = (over: Partial<ReviewOutput>): ReviewOutput => ({ job_id: job.id, verdict: "approve", score: 8, issues: [], unsupported_claims: [], ...over });

  it("accepts a consistent review", () => {
    expect(check(review({}))).toEqual([]);
    expect(check(review({ verdict: "revise", issues: [{ severity: "major", issue: "i", fix: "f" }] }))).toEqual([]);
  });

  it("rejects an approval that contradicts its own findings", () => {
    expect(check(review({ issues: [{ severity: "major", issue: "i", fix: "f" }] }))[0]).toMatch(/blocker\/major/);
    expect(check(review({ unsupported_claims: ["Led a team of 40"] }))[0]).toMatch(/unsupported_claims/);
  });

  it("rejects a revise verdict with nothing to fix, and an out-of-range score", () => {
    expect(check(review({ verdict: "revise" }))[0]).toMatch(/issues is empty/);
    expect(check(review({ score: 11 }))[0]).toMatch(/1-10/);
  });
});
