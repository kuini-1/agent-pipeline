import type { z } from "zod";
import type { AgentName } from "../protocol.js";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

export const totalTokens = (u: Usage) => u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

// Where a call sits in the run. Used for logging, and by the mock model's
// fault plan, which decides what to break from these fields.
export interface CallMeta {
  runId: string;
  jobRef?: string;
  revision: number;
  queueAttempt: number; // 0 on the first delivery of the queue job, 1 on the first retry, ...
}

export interface ModelRequest {
  agent: AgentName;
  system: string;
  turns: Turn[]; // the first is the task; each repair round adds an assistant/user pair
  schema: z.ZodType;
  maxTokens: number;
  signal?: AbortSignal;
  // The structured input behind the prompt. Real models read the prompt; the
  // mock model reads this instead of parsing prose.
  input: unknown;
  repairRound: number;
  meta: CallMeta;
}

export interface ModelResponse {
  text: string;
  model: string;
  stopReason: string;
  usage: Usage;
}

export interface ModelClient {
  readonly name: string;
  generate(req: ModelRequest): Promise<ModelResponse>;
}

/**
 * A failure that a retry of the same step won't fix: a refusal, a rejected
 * request, or output that stayed invalid through every repair round. The
 * pipeline records it as the job's result instead of retrying.
 */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class RefusedError extends PermanentError {}

/** Any other error (rate limits, overload, timeouts, network) is retried by the queue. */
export function isPermanent(err: unknown): err is PermanentError {
  return err instanceof PermanentError;
}
