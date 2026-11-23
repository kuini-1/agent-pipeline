// The mock model stands in for Claude in the demo and the integration tests,
// so its output has to pass the same checks real output does.
import { describe, expect, it } from "vitest";
import { researchAgent } from "../src/agents/research.js";
import { reviewerAgent } from "../src/agents/reviewer.js";
import { writerAgent } from "../src/agents/writer.js";
import type { ModelRequest } from "../src/model/client.js";
import { MockModel, MockOverloadedError } from "../src/model/mock.js";
import type { ReviewRequest, WriteRequest } from "../src/protocol.js";
import type { ResearchOutput, ReviewOutput, WriterOutput } from "../src/schemas.js";
import { criteria, jobs, meta, profile } from "./helpers.js";

const call = (agent: ModelRequest["agent"], input: unknown, over: Partial<ModelRequest> = {}): ModelRequest => ({
  agent,
  system: "",
  turns: [{ role: "user", content: "" }],
  schema: undefined as never,
  maxTokens: 1000,
  input,
  repairRound: 0,
  meta,
  ...over,
});

async function research(): Promise<ResearchOutput> {
  const res = await new MockModel().generate(call("research", { profile, criteria, jobs }));
  return JSON.parse(res.text);
}

describe("mock model", () => {
  it("screens the fixture jobs by the hard rules, then by keyword overlap", async () => {
    const out = await research();
    expect(researchAgent.check({ profile, criteria, jobs })(out)).toEqual([]);
    expect(out.selected.map((s) => s.job_id)).toEqual(["fx-quillstack-llm-platform", "fx-tidewater-retrieval", "fx-brightloop-applied-ai"]);
    const reasons = Object.fromEntries(out.rejected.map((r) => [r.job_id, r.reason]));
    expect(reasons["fx-copperleaf-ml-intern"]).toMatch(/below the \$3,000 floor/);
    expect(reasons["fx-harborline-senior-ai"]).toMatch(/Not open to candidates in Thailand/);
    expect(reasons["fx-northpass-llm-engineer"]).toMatch(/Not open to candidates in Thailand/);
    expect(reasons["fx-meridian-data-analyst"]).toMatch(/Weak match/);
  });

  it("matches regions as whole words", async () => {
    const only = (location: string) => [{ ...jobs[0]!, location }];
    const pick = async (location: string) =>
      (JSON.parse((await new MockModel().generate(call("research", { profile, criteria, jobs: only(location) }))).text) as ResearchOutput).selected.length;
    expect(await pick("Malaysia, Singapore")).toBe(0);
    expect(await pick("Remote, APAC")).toBe(1);
    expect(await pick("Thailand, Vietnam")).toBe(1);
  });

  it("writes drafts that pass the writer check for every selected job", async () => {
    const out = await research();
    for (const [i, s] of out.selected.entries()) {
      const w: WriteRequest = { profile, job: jobs.find((j) => j.id === s.job_id)!, research: s, rank: i + 1 };
      const res = await new MockModel().generate(call("writer", w));
      const d: WriterOutput = JSON.parse(res.text);
      expect(writerAgent.check(w)(d), s.job_id).toEqual([]);
    }
  });

  it("breaks the planned draft once and fixes it in the repair round", async () => {
    const s = (await research()).selected[0]!;
    const w: WriteRequest = { profile, job: jobs[0]!, research: s, rank: 1 };
    const m = new MockModel({ faults: { unsupportedClaim: 1 } });
    const bad: WriterOutput = JSON.parse((await m.generate(call("writer", w))).text);
    const fixed: WriterOutput = JSON.parse((await m.generate(call("writer", w, { repairRound: 1 }))).text);
    expect(writerAgent.check(w)(bad).join()).toMatch(/Fortune 500/);
    expect(writerAgent.check(w)(fixed)).toEqual([]);
  });

  it("fails a planned review only on the first delivery", async () => {
    const s = (await research()).selected[1]!;
    const w: WriteRequest = { profile, job: jobs[1]!, research: s, rank: 2 };
    const m = new MockModel({ faults: { transientError: 2 } });
    const d: WriterOutput = JSON.parse((await m.generate(call("writer", w))).text);
    const r: ReviewRequest = { ...w, draft: d };
    await expect(m.generate(call("reviewer", r))).rejects.toBeInstanceOf(MockOverloadedError);
    const review: ReviewOutput = JSON.parse((await m.generate(call("reviewer", r, { meta: { ...meta, queueAttempt: 1 } }))).text);
    expect(review.verdict).toBe("approve");
    expect(reviewerAgent.check(r)(review)).toEqual([]);
  });
});
