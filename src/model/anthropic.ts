import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { PermanentError, RefusedError, type ModelClient, type ModelRequest, type ModelResponse } from "./client.js";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ClaudeOptions {
  model: string;
  effort: Effort;
}

// Status codes where sending the same request again can't succeed.
const permanentStatus = new Set([400, 401, 402, 403, 404, 413, 422]);

// Calls Claude with structured outputs, so the response is JSON in the shape
// of the agent's schema. Parsing and the content checks happen in
// validate.ts, where a failure can be fed back as a repair round.
export class ClaudeClient implements ModelClient {
  readonly name: string;
  private client: Anthropic;

  constructor(private opts: ClaudeOptions) {
    this.name = opts.model;
    // Credentials come from ANTHROPIC_API_KEY. The SDK retries 429 and 5xx
    // twice with backoff; the queue retries the whole step after that.
    this.client = new Anthropic({ maxRetries: 2 });
  }

  async generate(req: ModelRequest): Promise<ModelResponse> {
    let response;
    try {
      response = await this.client.beta.messages.create(
        {
          model: this.opts.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: req.turns.map((t) => ({ role: t.role, content: t.content })),
          output_config: { format: betaZodOutputFormat(req.schema), effort: this.opts.effort },
          // If the model declines, the API retries the request on a fallback
          // model within the same call.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal: req.signal },
      );
    } catch (err) {
      if (err instanceof Anthropic.APIError && err.status !== undefined && permanentStatus.has(err.status)) {
        throw new PermanentError(`Claude API ${err.status}: ${err.message}`);
      }
      throw err;
    }

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category;
      throw new RefusedError(`the model declined${category ? ` (${category})` : ""}`);
    }
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }
    const u = response.usage;
    return {
      text,
      model: response.model,
      stopReason: response.stop_reason ?? "end_turn",
      usage: {
        inputTokens: u.input_tokens,
        outputTokens: u.output_tokens,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      },
    };
  }
}
