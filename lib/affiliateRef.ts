/** Cookie name for last-touch affiliate referral (primary site only). */
export const AFFILIATE_REF_COOKIE = "da3witi_ref";

const MAX_CODE_LENGTH = 64;

/**
 * Normalize ref query/cookie value: lowercase, URL-safe slug chars, max length.
 * Returns null if empty or invalid after normalization.
 */
export function normalizeAffiliateRef(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^a-z0-9_-]/g, "");
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_CODE_LENGTH);
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    const v = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}
