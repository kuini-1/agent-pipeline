import type { Usage } from "./client.js";

// USD per million tokens, Anthropic list prices as of November 2026.
// Cache writes use the 5-minute rate (1.25x input).
const prices: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

/** Cost in USD, or null for a model with no price (such as the mock). */
export function costUSD(model: string, u: Usage): number | null {
  const p = prices[model];
  if (!p) return null;
  return (u.inputTokens * p.input + u.cacheWriteTokens * p.input * 1.25 + u.cacheReadTokens * p.cacheRead + u.outputTokens * p.output) / 1e6;
}
