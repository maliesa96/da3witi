import { Redis } from "@upstash/redis";
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import { loadConfig } from "./config";
import { RateLimiter } from "./rate-limiter";
import { createStreamClient } from "./stream";
import { createWhatsAppClient } from "./whatsapp";
import { createGuestRepository } from "./db";
import { processEntry } from "./processor";
import { sleep } from "./utils";
import type { StreamEntry } from "./types";

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
        messageFormat: "{entryId} {kind} {msg}",
      },
    },
  });

  log.info(
    { stream: config.streamKey, group: config.group, consumer: config.consumer },
    `Starting worker: concurrency=${config.concurrency} rps=${config.rps}`
  );

  const redis = Redis.fromEnv();
  const adapter = new PrismaPg({ connectionString: config.databaseUrl })
  const prisma = new PrismaClient({ adapter })
  const limiter = new RateLimiter(config.rps);

  const stream = createStreamClient(redis, config);
  const whatsapp = createWhatsAppClient(config);
  const guests = createGuestRepository(prisma);

  await stream.ensureGroup();
  log.info("Consumer group ready");

  const queue: StreamEntry[] = [];
  const inFlight = new Set<Promise<void>>();
  let autoClaimCursor = "0-0";

  async function fillQueue() {
    // Try to auto-claim entries
    try {
      const claimed = await stream.autoClaim(autoClaimCursor);
      autoClaimCursor = claimed.cursor;
      if (claimed.entries.length > 0) {
        queue.push(...claimed.entries);
        log.info({ count: claimed.entries.length }, "Auto-claimed entries");
        return;
      }
    } catch (err) {
      log.warn({ error: String(err) }, "XAUTOCLAIM failed");
    }
    // Read entries from stream
    let batch = await stream.read("0");
    if (batch.length === 0) batch = await stream.read(">");
    if (batch.length > 0) {
      queue.push(...batch);
      log.debug({ count: batch.length }, "Fetched entries");
    }
  }

  while (true) {
    // Fill queue if empty
    if (queue.length === 0) {
      await fillQueue();
      if (queue.length === 0) {
        await sleep(config.idleSleepMs);
        continue;
      }
    }

    // Process entries up to concurrency limit
    while (inFlight.size < config.concurrency && queue.length > 0) {
      const entry = queue.shift()!;
      const promise = processEntry(entry, { config, log, whatsapp, guests, stream, limiter }).catch(
        (err) => {
          log.error({ entryId: entry.id, error: String(err) }, "Unhandled error");
        }
      );
      inFlight.add(promise);
      promise.finally(() => inFlight.delete(promise));
    }

    // Wait for at least one to complete
    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }
}

main().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
