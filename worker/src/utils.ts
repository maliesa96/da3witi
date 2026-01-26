export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function backoffMs(attempt: number): number {
  const base = 500;
  const max = 30_000;
  const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Safely parse a value that may be a JSON string or already parsed object */
export function parseFieldValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function summarizePayload(payload: Record<string, unknown>) {
  return {
    to: payload.to,
    type: payload.type,
    templateName: (payload.template as Record<string, unknown>)?.name,
  };
}
