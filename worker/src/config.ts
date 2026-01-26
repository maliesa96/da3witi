import { z } from "zod";
import os from "os";

export const configSchema = z.object({
  // Redis
  upstashRedisRestUrl: z.string().min(1),
  upstashRedisRestToken: z.string().min(1),

  // WhatsApp
  whatsappVersion: z.string().default("v23.0"),
  whatsappPhoneNumberId: z.string().min(1),
  metaAccessToken: z.string().min(1),

  // Database
  databaseUrl: z.string().min(1),

  // Stream keys
  streamKey: z.string().default("whatsapp:outbox"),
  dlqKey: z.string().default("whatsapp:dlq"),
  group: z.string().default("whatsapp-worker"),
  consumer: z.string().default(os.hostname()),

  // Worker settings
  concurrency: z.coerce.number().int().min(1).default(5),
  rps: z.coerce.number().int().min(1).default(10),
  maxRetries: z.coerce.number().int().min(1).default(5),
  readCount: z.coerce.number().int().min(1).default(25),
  idleSleepMs: z.coerce.number().int().min(100).default(750),
  autoClaimIdleMs: z.coerce.number().int().min(1000).default(60000),
  autoClaimCount: z.coerce.number().int().min(1).default(50),
  heartbeatMs: z.coerce.number().int().min(0).default(30000),

  // Logging
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  logPayloads: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const env = process.env;

  // Validate Upstash URL format
  const restUrl = env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  if (restUrl.startsWith("redis://") || restUrl.startsWith("rediss://") || restUrl.includes(":6379")) {
    throw new Error(
      `UPSTASH_REDIS_REST_URL looks like a TCP endpoint. This worker requires the Upstash REST URL (https://...)`
    );
  }

  return configSchema.parse({
    upstashRedisRestUrl: env.UPSTASH_REDIS_REST_URL,
    upstashRedisRestToken: env.UPSTASH_REDIS_REST_TOKEN,
    whatsappVersion: env.WHATSAPP_VERSION,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    metaAccessToken: env.META_ACCESS_TOKEN,
    databaseUrl: env.DATABASE_URL,
    streamKey: env.WHATSAPP_OUTBOX_STREAM_KEY,
    dlqKey: env.WHATSAPP_DLQ_STREAM_KEY,
    group: env.WHATSAPP_STREAM_GROUP,
    consumer: env.WHATSAPP_STREAM_CONSUMER,
    concurrency: env.WORKER_CONCURRENCY,
    rps: env.WORKER_RPS,
    maxRetries: env.WORKER_MAX_RETRIES,
    readCount: env.WORKER_READ_COUNT,
    idleSleepMs: env.WORKER_IDLE_SLEEP_MS,
    autoClaimIdleMs: env.WORKER_AUTOCLAIM_IDLE_MS,
    autoClaimCount: env.WORKER_AUTOCLAIM_COUNT,
    heartbeatMs: env.WORKER_HEARTBEAT_MS,
    logLevel: env.WORKER_LOG_LEVEL,
    logPayloads: env.WORKER_LOG_PAYLOADS,
  });
}
