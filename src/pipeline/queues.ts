import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { AgentName, Envelope } from "../protocol.js";
import type { RunConfig, RunStore } from "./store.js";

export const queuePrefix = "ap:bull";
export const agentQueues: AgentName[] = ["research", "writer", "reviewer", "report"];

const keepSeconds = 7 * 24 * 3600;

// One BullMQ queue per agent. A handoff is an enqueue on the receiving
// agent's queue, with the envelope id as the job id: BullMQ ignores an add
// whose id already exists, so a step that runs twice (a retry after a crash)
// can't send the next agent the same message twice.
export class Queues {
  private queues: Map<AgentName, Queue>;

  constructor(
    connection: Redis,
    private store: RunStore,
  ) {
    this.queues = new Map(agentQueues.map((name) => [name, new Queue(name, { connection, prefix: queuePrefix })]));
  }

  async send<T>(env: Envelope<T>, config: RunConfig): Promise<void> {
    await this.queues.get(env.to)!.add(env.to, env, {
      jobId: env.id,
      attempts: config.queueAttempts,
      backoff: { type: "exponential", delay: config.backoffMs },
      removeOnComplete: { age: keepSeconds },
      removeOnFail: { age: keepSeconds },
    });
    if (await this.store.markSent(env.runId, env.id)) {
      await this.store.event(env.runId, { type: "message.sent", agent: env.from, to: env.to, jobRef: env.jobRef, revision: env.revision });
    }
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
