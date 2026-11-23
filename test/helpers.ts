import { readFileSync } from "node:fs";
import type { ModelClient, ModelRequest, ModelResponse } from "../src/model/client.js";
import { CandidateProfile, JobPosting, SearchCriteria } from "../src/schemas.js";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../examples/${p}`, import.meta.url), "utf8"));

export const profile = CandidateProfile.parse(read("profile.json"));
export const criteria = SearchCriteria.parse(read("criteria.json"));
export const jobs = JobPosting.array().parse(read("jobs.json"));
export const fixtureSource = `fixture:${new URL("../examples/jobs.json", import.meta.url).pathname}`;

export const meta = { runId: "test", revision: 0, queueAttempt: 0 };

export function reply(text: string, stopReason = "end_turn"): ModelResponse {
  return { text, model: "scripted", stopReason, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } };
}

/** A model whose answers come from a function, with every request recorded. */
export class ScriptedModel implements ModelClient {
  readonly name = "scripted";
  readonly calls: ModelRequest[] = [];
  constructor(private answer: (req: ModelRequest, call: number) => ModelResponse | Promise<ModelResponse>) {}
  async generate(req: ModelRequest): Promise<ModelResponse> {
    this.calls.push(structuredClone({ ...req, signal: undefined, schema: undefined as never }));
    return this.answer(req, this.calls.length - 1);
  }
}
