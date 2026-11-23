// Every agent output goes through callValidated. Structured outputs fix the
// JSON shape, zod checks it again (the mock model and a truncated response
// can both break it), and an agent-specific check looks at the content. Any
// failure becomes a repair round: the model sees its own output and the
// exact errors, and tries again. After maxRepairs rounds the step fails with
// InvalidOutputError, which the queue does not retry, because the same
// prompt would most likely fail the same way.
import type { z } from "zod";
import { PermanentError, addUsage, emptyUsage, type ModelClient, type ModelRequest, type Usage } from "./model/client.js";

export interface Attempt {
  round: number;
  ok: boolean;
  errors: string[];
  model: string;
  usage: Usage;
  ms: number;
}

export interface Validated<T> {
  value: T;
  attempts: Attempt[];
  usage: Usage;
  model: string;
}

/** Returns a list of problems; empty means the value is acceptable. */
export type Check<T> = (value: T) => string[];

export class InvalidOutputError extends PermanentError {
  constructor(
    message: string,
    readonly errors: string[],
    readonly attempts: Attempt[],
    readonly usage: Usage,
  ) {
    super(message);
  }
}

export function repairPrompt(errors: string[]): string {
  return [
    "Your previous output failed validation:",
    ...errors.map((e) => `- ${e}`),
    "",
    "Return the complete corrected JSON. Fix what the errors name and keep everything else.",
  ].join("\n");
}

function zodErrors(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`);
}

/** Parses and checks one response. Returns the value, or the errors to repair. */
export function evaluate<T>(text: string, stopReason: string, schema: z.ZodType<T>, check: Check<T>): { value?: T; errors: string[] } {
  if (stopReason === "max_tokens") {
    return { errors: ["the output was cut off at the token limit; write less in each field"] };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { errors: ["the output is not valid JSON"] };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const errors = check(parsed.data);
  return errors.length ? { errors } : { value: parsed.data, errors };
}

export async function callValidated<T>(
  model: ModelClient,
  req: Omit<ModelRequest, "repairRound" | "schema"> & { schema: z.ZodType<T> },
  check: Check<T>,
  opts: { maxRepairs: number; onAttempt?: (a: Attempt) => void | Promise<void> },
): Promise<Validated<T>> {
  const turns = [...req.turns];
  const attempts: Attempt[] = [];
  let usage = emptyUsage();
  let errors: string[] = [];

  for (let round = 0; round <= opts.maxRepairs; round++) {
    const start = Date.now();
    const resp = await model.generate({ ...req, turns, repairRound: round });
    usage = addUsage(usage, resp.usage);

    const result = evaluate(resp.text, resp.stopReason, req.schema, check);
    errors = result.errors;
    const attempt: Attempt = { round, ok: result.value !== undefined, errors, model: resp.model, usage: resp.usage, ms: Date.now() - start };
    attempts.push(attempt);
    await opts.onAttempt?.(attempt);
    if (result.value !== undefined) {
      return { value: result.value, attempts, usage, model: resp.model };
    }
    turns.push({ role: "assistant", content: resp.text || "(empty)" }, { role: "user", content: repairPrompt(errors) });
  }
  throw new InvalidOutputError(`${req.agent} output still invalid after ${opts.maxRepairs} repair round(s)`, errors, attempts, usage);
}
