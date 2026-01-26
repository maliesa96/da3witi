import type { Redis } from "@upstash/redis";
import type { Config } from "./config";
import type { StreamEntry } from "./types";
import { parseFieldValue, toRecord } from "./utils";

function parseStreamEntries(raw: unknown[]): StreamEntry[] {
  const entries: StreamEntry[] = [];

  for (const streamItem of raw) {
    if (!Array.isArray(streamItem)) continue;
    const messages = streamItem[1];
    if (!Array.isArray(messages)) continue;

    for (const msg of messages) {
      if (!Array.isArray(msg)) continue;
      const [id, fieldsArr] = msg;
      if (typeof id !== "string" || !Array.isArray(fieldsArr)) continue;

      const fields: Record<string, unknown> = {};
      for (let i = 0; i < fieldsArr.length; i += 2) {
        fields[String(fieldsArr[i])] = fieldsArr[i + 1];
      }

      entries.push({
        id,
        payload: toRecord(parseFieldValue(fields.payload)),
        meta: toRecord(parseFieldValue(fields.meta)),
      });
    }
  }

  return entries;
}

function parseAutoClaimResponse(raw: unknown): { cursor: string; entries: StreamEntry[] } {
  if (!Array.isArray(raw) || raw.length < 2) {
    return { cursor: "0-0", entries: [] };
  }

  const cursor = typeof raw[0] === "string" ? raw[0] : "0-0";
  const messagesRaw = raw[1];
  if (!Array.isArray(messagesRaw)) {
    return { cursor, entries: [] };
  }

  const entries: StreamEntry[] = [];
  for (const msg of messagesRaw) {
    if (!Array.isArray(msg)) continue;
    const [id, fieldsArr] = msg;
    if (typeof id !== "string" || !Array.isArray(fieldsArr)) continue;

    const fields: Record<string, unknown> = {};
    for (let i = 0; i < fieldsArr.length; i += 2) {
      fields[String(fieldsArr[i])] = fieldsArr[i + 1];
    }

    entries.push({
      id,
      payload: toRecord(parseFieldValue(fields.payload)),
      meta: toRecord(parseFieldValue(fields.meta)),
    });
  }

  return { cursor, entries };
}

export function createStreamClient(redis: Redis, config: Config) {
  const { streamKey, dlqKey, group, consumer, readCount, autoClaimIdleMs, autoClaimCount } = config;

  return {
    async ensureGroup(): Promise<void> {
      try {
        await redis.xgroup(streamKey, { type: "CREATE", group, id: "$", options: { MKSTREAM: true } });
      } catch (err) {
        if (!String(err).includes("BUSYGROUP")) throw err;
      }
    },

    async read(id: ">" | "0"): Promise<StreamEntry[]> {
      const raw = (await redis.xreadgroup(group, consumer, streamKey, id, { count: readCount })) as unknown[];
      return Array.isArray(raw) ? parseStreamEntries(raw) : [];
    },

    async autoClaim(cursor: string): Promise<{ cursor: string; entries: StreamEntry[] }> {
      const raw = await redis.xautoclaim(streamKey, group, consumer, autoClaimIdleMs, cursor, {
        count: autoClaimCount,
      });
      return parseAutoClaimResponse(raw);
    },

    async ack(entryId: string): Promise<void> {
      await redis.xack(streamKey, group, entryId);
      // Remove the entry from the stream after acknowledging
      await redis.xdel(streamKey, entryId);
    },

    async moveToDlq(entry: StreamEntry, extra: Record<string, unknown>): Promise<void> {
      await redis.xadd(dlqKey, "*", {
        payload: JSON.stringify(entry.payload),
        meta: JSON.stringify(entry.meta),
        extra: JSON.stringify(extra),
      });
    },
  };
}

export type StreamClient = ReturnType<typeof createStreamClient>;
