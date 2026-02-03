import { Queue, Job } from "bullmq";
import Redis from "ioredis";

const QUEUE_NAME = process.env.QUEUE_NAME || "whatsapp";

export class RedisConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisConfigError";
  }
}

export type WhatsAppOutboxMeta =
  | {
      kind: "invite";
      guestId: string;
      eventId: string;
      locale: "en" | "ar";
    }
  | {
      kind: "webhook_followup";
      guestId?: string;
      repliedMessageId?: string;
    }
  | Record<string, unknown>;

interface JobData {
  payload: Record<string, unknown>;
  meta: WhatsAppOutboxMeta;
}

// Lazy-initialized queue instance
let queue: Queue<JobData> | null = null;

function getQueue(): Queue<JobData> {
  if (queue) return queue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new RedisConfigError("REDIS_URL environment variable is not set");
  }

  // Create a new Redis connection for BullMQ
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  });

  queue = new Queue<JobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 500,
      },
      removeOnComplete: 1000, // Keep last 1000 completed jobs
      removeOnFail: 5000, // Keep last 5000 failed jobs
    },
  });

  return queue;
}

function assertValidWhatsAppPayload(payload: unknown): asserts payload is Record<string, unknown> {
  if (typeof payload === "string") {
    throw new Error(
      "Invalid WhatsApp payload: got a string. Pass the raw object body (do not JSON.stringify before enqueueing)."
    );
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Invalid WhatsApp payload: expected a JSON object body.");
  }

  const p = payload as Record<string, unknown>;
  if (p.messaging_product !== "whatsapp") {
    throw new Error('Invalid WhatsApp payload: missing/invalid "messaging_product" (expected "whatsapp").');
  }
  if (typeof p.to !== "string" || p.to.trim().length === 0) {
    throw new Error('Invalid WhatsApp payload: missing/invalid "to".');
  }
  if (typeof p.type !== "string" || p.type.trim().length === 0) {
    throw new Error('Invalid WhatsApp payload: missing/invalid "type".');
  }
}

/**
 * Enqueue a single WhatsApp request payload.
 */
export async function enqueueWhatsAppOutbox(payload: unknown, meta: WhatsAppOutboxMeta = {}) {
  assertValidWhatsAppPayload(payload);
  const q = getQueue();
  const job = await q.add("send", { payload, meta });
  return job.id;
}

/**
 * Enqueue multiple WhatsApp request payloads in a batch.
 */
export async function enqueueWhatsAppOutboxBatch(
  jobs: Array<{ payload: unknown; meta?: WhatsAppOutboxMeta }>
) {
  if (jobs.length === 0) return [];

  const q = getQueue();
  const bulkJobs = jobs.map((job) => {
    assertValidWhatsAppPayload(job.payload);
    return {
      name: "send",
      data: { payload: job.payload, meta: job.meta ?? {} },
    };
  });

  const addedJobs = await q.addBulk(bulkJobs);
  return addedJobs.map((j: Job<JobData>) => j.id);
}
