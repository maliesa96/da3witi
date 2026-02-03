import { z } from "zod";

export const configSchema = z.object({
  // Redis (TCP connection for BullMQ - e.g., rediss://default:xxx@xxx.upstash.io:6379)
  redisUrl: z.string().min(1),

  // WhatsApp
  whatsappVersion: z.string().default("v23.0"),
  whatsappPhoneNumberId: z.string().min(1),
  metaAccessToken: z.string().min(1),

  // Database
  databaseUrl: z.string().min(1),

  // Queue name
  queueName: z.string().default("whatsapp"),

  // Worker settings
  concurrency: z.coerce.number().int().min(1).default(5),
  rps: z.coerce.number().int().min(1).default(40), // WhatsApp allows 80/sec
  maxRetries: z.coerce.number().int().min(1).default(5),

  // Logging
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const env = process.env;

  return configSchema.parse({
    redisUrl: env.REDIS_URL,
    whatsappVersion: env.WHATSAPP_VERSION,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    metaAccessToken: env.META_ACCESS_TOKEN,
    databaseUrl: env.DATABASE_URL,
    queueName: env.QUEUE_NAME,
    concurrency: env.WORKER_CONCURRENCY,
    rps: env.WORKER_RPS,
    maxRetries: env.WORKER_MAX_RETRIES,
    logLevel: env.WORKER_LOG_LEVEL,
  });
}
