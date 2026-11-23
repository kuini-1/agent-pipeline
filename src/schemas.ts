// Schemas for everything that crosses an agent boundary. Each agent's output
// is generated with structured outputs from these schemas, then parsed with
// zod again and checked by the semantic validators in validators.ts.
import { z } from "zod";

// ---- inputs ----

export const CandidateProfile = z.object({
  name: z.string(),
  headline: z.string(),
  location: z.string(),
  remote_only: z.boolean(),
  years_experience: z.number(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      period: z.string(),
      highlights: z.array(z.string()),
    }),
  ),
  projects: z.array(z.object({ name: z.string(), summary: z.string() })).default([]),
});
export type CandidateProfile = z.infer<typeof CandidateProfile>;

export const SearchCriteria = z.object({
  keywords: z.array(z.string()).min(1),
  min_monthly_usd: z.number().default(0),
  must_be_open_to: z.string().describe("country or region the candidate works from"),
  max_jobs: z.number().int().min(1).max(10).default(3),
});
export type SearchCriteria = z.infer<typeof SearchCriteria>;

export const JobPosting = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  url: z.string(),
  location: z.string(),
  salary_monthly_usd: z.number().nullable(),
  description: z.string(),
});
export type JobPosting = z.infer<typeof JobPosting>;

// ---- agent outputs ----

// Research agent: picks the jobs worth applying to and says why.
export const ResearchOutput = z.object({
  selected: z
    .array(
      z.object({
        job_id: z.string(),
        match_score: z.number().int().describe("0-100: how well the candidate fits the role"),
        why_match: z.string().describe("one or two sentences, grounded in the profile"),
        key_requirements: z.array(z.string()).describe("3-6 requirements quoted or paraphrased from the posting"),
        concerns: z.array(z.string()).describe("gaps the cover letter should not paper over"),
      }),
    )
    .describe("best matches first"),
  rejected: z.array(z.object({ job_id: z.string(), reason: z.string() })),
});
export type ResearchOutput = z.infer<typeof ResearchOutput>;

// Writer agent: a tailored cover letter plus resume bullets, with every
// factual claim tied to the profile text that supports it.
export const WriterOutput = z.object({
  job_id: z.string(),
  cover_letter: z.string().describe("180-320 words, plain text, no placeholders"),
  resume_bullets: z.array(z.string()).describe("3-5 bullets tailored to this job"),
  claims: z
    .array(
      z.object({
        claim: z.string().describe("a factual statement about the candidate made in the letter"),
        evidence: z.string().describe("the exact text from the profile that supports it, copied verbatim"),
      }),
    )
    .describe("every factual claim about the candidate in the letter"),
});
export type WriterOutput = z.infer<typeof WriterOutput>;

// Review agent: decides whether the draft can be sent.
export const ReviewOutput = z.object({
  job_id: z.string(),
  verdict: z.enum(["approve", "revise"]),
  score: z.number().int().describe("1-10"),
  issues: z.array(
    z.object({
      severity: z.enum(["blocker", "major", "minor"]),
      issue: z.string(),
      fix: z.string(),
    }),
  ),
  unsupported_claims: z.array(z.string()).describe("claims in the letter that the profile does not support"),
});
export type ReviewOutput = z.infer<typeof ReviewOutput>;
