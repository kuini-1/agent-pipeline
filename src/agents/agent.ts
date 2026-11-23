import type { z } from "zod";
import type { AgentName } from "../protocol.js";
import type { CallMeta, ModelClient } from "../model/client.js";
import { callValidated, type Attempt, type Check, type Validated } from "../validate.js";

// An agent is a prompt, an output schema and a content check. The queue
// worker owns everything else (handoff, retries, stop rules), so agents stay
// plain functions that are easy to test.
export interface Agent<I, O> {
  name: AgentName;
  schema: z.ZodType<O>;
  system: string;
  maxTokens: number;
  prompt(input: I): string;
  check(input: I): Check<O>;
}

export interface RunContext {
  meta: CallMeta;
  signal?: AbortSignal;
  maxRepairs: number;
  onAttempt?: (a: Attempt) => void | Promise<void>;
}

export function runAgent<I, O>(model: ModelClient, agent: Agent<I, O>, input: I, ctx: RunContext): Promise<Validated<O>> {
  return callValidated(
    model,
    {
      agent: agent.name,
      system: agent.system,
      turns: [{ role: "user", content: agent.prompt(input) }],
      schema: agent.schema,
      maxTokens: agent.maxTokens,
      signal: ctx.signal,
      input,
      meta: ctx.meta,
    },
    agent.check(input),
    { maxRepairs: ctx.maxRepairs, onAttempt: ctx.onAttempt },
  );
}

// Helpers shared by the agents' prompts and checks.

export const json = (v: unknown) => JSON.stringify(v, null, 2);

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Lowercase, straight quotes, single spaces, no trailing period. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
}

const placeholderPattern = /\[[^\]\n]{1,40}\]|\{\{[^}\n]*\}\}|<[A-Z][A-Za-z ]{1,30}>|\b(TODO|TBD)\b|lorem ipsum/i;

export function findPlaceholder(s: string): string | null {
  const m = placeholderPattern.exec(s);
  return m ? m[0] : null;
}
