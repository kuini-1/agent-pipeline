import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isPermanent } from "../src/model/client.js";
import { InvalidOutputError, callValidated } from "../src/validate.js";
import { ScriptedModel, meta, reply } from "./helpers.js";

const Schema = z.object({ answer: z.string(), n: z.number() });
const positive = (v: z.infer<typeof Schema>) => (v.n > 0 ? [] : ["n must be positive"]);
const req = {
  agent: "writer" as const,
  system: "system",
  turns: [{ role: "user" as const, content: "task" }],
  schema: Schema,
  maxTokens: 100,
  input: {},
  meta,
};

describe("callValidated", () => {
  it("returns the first valid output without repair rounds", async () => {
    const model = new ScriptedModel(() => reply('{"answer":"ok","n":1}'));
    const res = await callValidated(model, req, positive, { maxRepairs: 2 });
    expect(res.value).toEqual({ answer: "ok", n: 1 });
    expect(res.attempts).toHaveLength(1);
    expect(model.calls).toHaveLength(1);
  });

  it("feeds each failure back and accepts the repaired output", async () => {
    const answers = ["not json", '{"answer":"a","n":0}', '{"answer":"a","n":2}'];
    const model = new ScriptedModel((_, i) => reply(answers[i]!));
    const res = await callValidated(model, req, positive, { maxRepairs: 2 });

    expect(res.value.n).toBe(2);
    expect(res.attempts.map((a) => a.ok)).toEqual([false, false, true]);
    expect(res.attempts[0]!.errors).toEqual(["the output is not valid JSON"]);
    expect(res.attempts[1]!.errors).toEqual(["n must be positive"]);

    // The last call carries the whole conversation: task, bad output, errors, bad output, errors.
    const last = model.calls[2]!;
    expect(last.turns.map((t) => t.role)).toEqual(["user", "assistant", "user", "assistant", "user"]);
    expect(last.turns[1]!.content).toBe("not json");
    expect(last.turns[4]!.content).toContain("- n must be positive");
    expect(last.repairRound).toBe(2);
    expect(res.usage.inputTokens).toBe(30);
  });

  it("gives up after maxRepairs with a permanent error that keeps every attempt", async () => {
    const model = new ScriptedModel(() => reply('{"answer":"a","n":-1}'));
    const err = await callValidated(model, req, positive, { maxRepairs: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidOutputError);
    expect(isPermanent(err)).toBe(true);
    expect(err.attempts).toHaveLength(2);
    expect(err.errors).toEqual(["n must be positive"]);
    expect(err.usage.inputTokens).toBe(20);
  });

  it("treats a max_tokens stop as invalid even when the text parses", async () => {
    const answers = [reply('{"answer":"a","n":1}', "max_tokens"), reply('{"answer":"a","n":1}')];
    const model = new ScriptedModel((_, i) => answers[i]!);
    const res = await callValidated(model, req, positive, { maxRepairs: 1 });
    expect(res.attempts[0]!.errors[0]).toMatch(/token limit/);
    expect(res.attempts).toHaveLength(2);
  });

  it("names the failing fields for schema errors", async () => {
    const model = new ScriptedModel(() => reply('{"answer":1}'));
    const err = await callValidated(model, req, positive, { maxRepairs: 0 }).catch((e) => e);
    expect(err.errors.some((e: string) => e.startsWith("answer:"))).toBe(true);
    expect(err.errors.some((e: string) => e.startsWith("n:"))).toBe(true);
  });

  it("calls onAttempt for every round", async () => {
    const seen: number[] = [];
    const answers = ["{}", '{"answer":"a","n":1}'];
    const model = new ScriptedModel((_, i) => reply(answers[i]!));
    await callValidated(model, req, positive, { maxRepairs: 2, onAttempt: (a) => void seen.push(a.round) });
    expect(seen).toEqual([0, 1]);
  });
});
