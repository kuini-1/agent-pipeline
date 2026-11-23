// The agent communication protocol: every handoff is an Envelope on a queue.
//
//   research ──(write.request × N jobs)──▶ writer ──▶ reviewer ──┐
//                                            ▲                    │ revise (until max revisions)
//                                            └────────────────────┘
//                                                                 │ approve / give up / fail
//                                                                 ▼
//                                     fan-in counter reaches 0 ──▶ report
//
// Envelopes carry everything the next agent needs, so a worker never reads
// another agent's private state, and any message can be replayed from the
// run's event log.
import type { CandidateProfile, JobPosting, ResearchOutput, ReviewOutput, SearchCriteria, WriterOutput } from "./schemas.js";

export type AgentName = "research" | "writer" | "reviewer" | "report";

export interface Envelope<T> {
  id: string; // unique per message and used as the BullMQ job id, so a duplicate enqueue is a no-op
  runId: string;
  from: AgentName | "client";
  to: AgentName;
  jobRef?: string; // the job posting this message is about (fan-out branch)
  revision: number; // 0 for the first draft
  createdAt: string;
  payload: T;
}

export interface ResearchRequest {
  profile: CandidateProfile;
  criteria: SearchCriteria;
}

export type Selected = ResearchOutput["selected"][number];

export interface WriteRequest {
  profile: CandidateProfile;
  job: JobPosting;
  research: Selected;
  rank: number; // 1 = best match
  previous?: WriterOutput; // the draft being revised
  feedback?: ReviewOutput; // why it is being revised
}

export interface ReviewRequest {
  profile: CandidateProfile;
  job: JobPosting;
  research: Selected;
  rank: number;
  draft: WriterOutput;
}

export type ReportRequest = Record<string, never>;

// Terminal outcome of one fan-out branch.
export interface JobResult {
  jobId: string;
  rank: number;
  status: "approved" | "gave_up" | "failed" | "stopped";
  reason?: string;
  revisions: number;
  draft?: WriterOutput;
  review?: ReviewOutput;
}

// BullMQ job ids can't contain ":", so the parts are joined with ".".
// Job refs are slugs (see sources/jobs.ts), so they never contain one either.
export function envelopeId(runId: string, to: AgentName, jobRef: string | undefined, revision: number): string {
  return [runId, to, jobRef ?? "-", `r${revision}`].join(".");
}

export function envelope<T>(e: Omit<Envelope<T>, "id" | "createdAt">): Envelope<T> {
  return { ...e, id: envelopeId(e.runId, e.to, e.jobRef, e.revision), createdAt: new Date().toISOString() };
}
