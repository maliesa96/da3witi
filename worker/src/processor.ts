import type pino from "pino";
import type { Config } from "./config";
import type { StreamEntry } from "./types";
import type { WhatsAppClient } from "./whatsapp";
import type { GuestRepository } from "./db";
import type { StreamClient } from "./stream";
import type { RateLimiter } from "./rate-limiter";
import { backoffMs, isRetryableStatus, sleep, summarizePayload } from "./utils";

export interface ProcessorDeps {
  config: Config;
  log: pino.Logger;
  whatsapp: WhatsAppClient;
  guests: GuestRepository;
  stream: StreamClient;
  limiter: RateLimiter;
}

export async function processEntry(entry: StreamEntry, deps: ProcessorDeps): Promise<void> {
  const { config, log, whatsapp, guests, stream, limiter } = deps;
  const { kind, guestId, eventId } = entry.meta;
  const isInvite = kind === "invite" && guestId;

  const entryLog = log.child({ entryId: entry.id, kind: kind ?? "unknown", guestId, eventId });

  const summary = summarizePayload(entry.payload);
  entryLog.info({ to: summary.to, template: summary.templateName }, "Processing");

  let attempt = isInvite ? await guests.incrementAttempts(guestId!) : 1;

  while (true) {
    await limiter.acquire();
    const res = await whatsapp.send(entry.payload);

    if (res.ok) {
      const messageId = whatsapp.extractMessageId(res.data);
      if (isInvite) await guests.markSent(guestId!, messageId ?? null);
      await stream.ack(entry.id);
      entryLog.info({ messageId }, "Sent successfully");
      return;
    }

    const errorStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    entryLog.warn({ status: res.status, attempt, error: errorStr }, "API failed");

    if (isInvite) await guests.setError(guestId!, errorStr);

    const shouldRetry = isRetryableStatus(res.status) && attempt < config.maxRetries;

    if (!shouldRetry) {
      if (isInvite) await guests.markFailed(guestId!, errorStr);
      await stream.moveToDlq(entry, { error: errorStr, httpStatus: res.status, attempt });
      await stream.ack(entry.id);
      entryLog.error({ status: res.status, attempt }, "Moved to DLQ");
      return;
    }

    const wait = backoffMs(attempt);
    entryLog.warn({ waitMs: wait, attempt, maxRetries: config.maxRetries }, "Retrying after backoff");
    await sleep(wait);

    attempt = isInvite ? await guests.incrementAttempts(guestId!) : attempt + 1;
  }
}
