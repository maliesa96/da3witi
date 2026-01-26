import { Redis } from "@upstash/redis";

export const WHATSAPP_OUTBOX_STREAM_KEY = "whatsapp:outbox";
export const WHATSAPP_DLQ_STREAM_KEY = "whatsapp:dlq";

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
      // Optional correlation fields for debugging
      guestId?: string;
      repliedMessageId?: string;
    }
  | Record<string, unknown>;

function assertValidWhatsAppPayload(payload: unknown): asserts payload is Record<string, unknown> {
  // We only accept the raw JSON object body expected by WhatsApp Cloud API /messages.
  // Reject strings to avoid double-encoding (which results in Meta treating it as a JSON string).
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

function getRedis() {
  // Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  return Redis.fromEnv();
}

/**
 * Enqueue a single WhatsApp request payload into the outbox stream.
 *
 * IMPORTANT: `payload` must be the exact JSON body the WhatsApp Cloud API expects for /messages.
 */
export async function enqueueWhatsAppOutbox(payload: unknown, meta: WhatsAppOutboxMeta = {}) {
  assertValidWhatsAppPayload(payload);
  const redis = getRedis();
  return await redis.xadd(WHATSAPP_OUTBOX_STREAM_KEY, "*", {
    payload: JSON.stringify(payload),
    meta: JSON.stringify(meta),
  });
}

export async function enqueueWhatsAppOutboxBatch(
  jobs: Array<{ payload: unknown; meta?: WhatsAppOutboxMeta }>
) {
  if (jobs.length === 0) return [];
  const redis = getRedis();
  const pipeline = redis.pipeline();

  for (const job of jobs) {
    assertValidWhatsAppPayload(job.payload);
    pipeline.xadd(WHATSAPP_OUTBOX_STREAM_KEY, "*", {
      payload: JSON.stringify(job.payload),
      meta: JSON.stringify(job.meta ?? {}),
    });
  }

  const res = await pipeline.exec();
  // Pipeline returns an array of results; each item is the XADD-generated entry id.
  return res as string[];
}

