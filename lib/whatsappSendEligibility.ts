export type WhatsAppSendEligibilityGuest = {
  status: string;
  whatsappMessageId: string | null;
  whatsappSendEnqueuedAt: Date | null;
};

export type WhatsAppSendEligibilityOptions = {
  /**
   * Allow retrying "pending" guests if they look stuck in-queue.
   * Defaults to 10 minutes.
   */
  staleEnqueueMs?: number;
  /** For deterministic tests/callers; defaults to Date.now(). */
  now?: Date;
};

/**
 * Eligibility rules for enqueueing WhatsApp invite sends.
 *
 * - Never enqueue if already has `whatsappMessageId`.
 * - Only enqueue statuses: pending, failed
 * - Failed: always eligible (even if enqueuedAt is set/stuck)
 * - Pending: eligible if never enqueued, or if enqueuedAt is stale
 */
export function shouldEnqueueWhatsAppInvite(
  guest: WhatsAppSendEligibilityGuest,
  opts: WhatsAppSendEligibilityOptions = {}
) {
  if (guest.whatsappMessageId) return false;
  if (guest.status !== "pending" && guest.status !== "failed") return false;
  if (guest.status === "failed") return true;

  const staleEnqueueMs = opts.staleEnqueueMs ?? 10 * 60 * 1000;
  const now = opts.now ?? new Date();

  if (!guest.whatsappSendEnqueuedAt) return true;
  const cutoff = new Date(now.getTime() - staleEnqueueMs);
  return guest.whatsappSendEnqueuedAt < cutoff;
}

