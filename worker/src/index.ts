import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadConfig } from "./config";
import { createWhatsAppClient } from "./whatsapp";
import { createGuestRepository } from "./db";
import type { JobData } from "./types";

async function main() {
  const config = loadConfig();

  const log = pino({
    level: config.logLevel,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss",
      },
    },
  });

  log.info(
    { queue: config.queueName, concurrency: config.concurrency, rps: config.rps },
    "Starting BullMQ worker"
  );

  // Create Redis connection for BullMQ
  const connection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  });

  // Create Prisma client
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  const prisma = new PrismaClient({ adapter });

  // Create clients
  const whatsapp = createWhatsAppClient(config);
  const guests = createGuestRepository(prisma);

  // Create BullMQ worker
  const worker = new Worker<JobData>(
    config.queueName,
    async (job: Job<JobData>) => {
      const { payload, meta } = job.data;
      const isInvite = meta.kind === "invite" && meta.guestId;

      const summary = {
        to: payload.to,
        type: payload.type,
        template: (payload.template as Record<string, unknown>)?.name,
      };

      log.info({ jobId: job.id, ...summary, kind: meta.kind }, "Processing job");

      // Send to WhatsApp
      const res = await whatsapp.send(payload);

      if (res.ok) {
        const messageId = whatsapp.extractMessageId(res.data);

        // Update guest status if this is an invite
        if (isInvite) {
          await guests.markSent(meta.guestId!, messageId ?? null);
        }

        log.info({ jobId: job.id, messageId }, "Sent successfully");
        return { success: true, messageId };
      }

      // Handle failure
      const errorStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      log.warn({ jobId: job.id, status: res.status, error: errorStr }, "WhatsApp API failed");

      if (isInvite) {
        await guests.setError(meta.guestId!, errorStr);
      }

      // Throw to trigger BullMQ retry
      const error = new Error(`WhatsApp API error: ${res.status}`);
      (error as Error & { statusCode?: number }).statusCode = res.status;
      throw error;
    },
    {
      connection,
      concurrency: config.concurrency,
      limiter: {
        max: config.rps,
        duration: 1000, // per second
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 500ms, 1s, 2s, 4s, 8s... max 30s
          const base = 500;
          const max = 30000;
          return Math.min(max, base * Math.pow(2, attemptsMade));
        },
      },
    }
  );

  // Handle job failures (after all retries exhausted)
  worker.on("failed", async (job: Job<JobData> | undefined, err: Error) => {
    if (!job) return;

    const meta = job.data.meta;
    log.error(
      { jobId: job.id, kind: meta.kind, guestId: meta.guestId, error: err.message },
      "Job failed permanently"
    );

    // Mark invite as failed in database
    if (meta.kind === "invite" && meta.guestId) {
      await guests.markFailed(meta.guestId, err.message);
    }
  });

  worker.on("completed", (job: Job<JobData>) => {
    log.debug({ jobId: job.id }, "Job completed");
  });

  worker.on("error", (err: Error) => {
    log.error({ error: err.message }, "Worker error");
  });

  log.info("Worker is running. Waiting for jobs...");

  // Graceful shutdown
  const shutdown = async () => {
    log.info("Shutting down...");
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
