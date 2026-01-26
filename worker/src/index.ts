import { Redis } from "@upstash/redis";
import { Pool } from "pg";
import pino from "pino";

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
    formatters: {
      level: (label) => ({ level: label }),
    },
  });

  log.info(
    {
      stream: config.streamKey,
      dlq: config.dlqKey,
      group: config.group,
      consumer: config.consumer,
      concurrency: config.concurrency,
      rps: config.rps,
      maxRetries: config.maxRetries,
    },
    "Starting WhatsApp worker"
  );

  const redis = Redis.fromEnv();
  const pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 10_000 });
  const limiter = new RateLimiter(config.rps);

  const stream = createStreamClient(redis, config);
  const whatsapp = createWhatsAppClient(config);
  const guests = createGuestRepository(pool);

  await stream.ensureGroup();

  const queue: StreamEntry[] = [];
  const inFlight = new Set<Promise<void>>();
  let autoClaimCursor = "0-0";
  let lastHeartbeat = 0;

  async function fillQueue() {
    // Try to reclaim stuck entries first
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

    // Read pending, then new entries
    let batch = await stream.read("0");
    if (batch.length === 0) batch = await stream.read(">");
    if (batch.length > 0) {
      queue.push(...batch);
      log.debug({ count: batch.length }, "Fetched entries");
    }
  }

  // Main loop
  while (true) {
    // Heartbeat
    const now = Date.now();
    if (config.heartbeatMs > 0 && now - lastHeartbeat >= config.heartbeatMs) {
      lastHeartbeat = now;
      log.info({ queueSize: queue.length, inFlight: inFlight.size }, "Heartbeat");
    }

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
      const promise = processEntry(entry, { config, log, whatsapp, guests, stream, limiter }).catch((err) => {
        log.error({ entryId: entry.id, error: String(err) }, "Unhandled error");
      });
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
