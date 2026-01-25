export type PhoneValidationErrorCode =
  | 'EMPTY'
  | 'LETTERS'
  | 'MISSING_COUNTRY_CODE'
  | 'INVALID_FORMAT';

export type PhoneValidationResult =
  | { ok: true; phone: string }
  | { ok: false; code: PhoneValidationErrorCode };

/**
 * Normalize and validate a phone number into E.164 format.
 *
 * Rules:
 * - Must include a country code (requires leading '+', accepts '00' prefix and converts to '+')
 * - Any spaces/parenthesis/dashes/etc are stripped
 * - Any letters make the input invalid
 * - Final format must match E.164: +[1-9][0-9]{7,14}
 */
export function normalizePhoneToE164(raw: string): PhoneValidationResult {
  const input = String(raw ?? '').trim();
  if (!input) return { ok: false, code: 'EMPTY' };

  // Any kind of letter (Latin/Arabic/etc) is invalid in phone numbers
  if (/\p{L}/u.test(input)) return { ok: false, code: 'LETTERS' };

  // Accept "00" prefix and convert to "+"
  const working = input.startsWith('00') ? `+${input.slice(2)}` : input;

  const plusMatches = working.match(/\+/g);
  const plusCount = plusMatches ? plusMatches.length : 0;
  if (plusCount > 1) return { ok: false, code: 'INVALID_FORMAT' };
  if (plusCount === 1 && !working.startsWith('+')) return { ok: false, code: 'INVALID_FORMAT' };

  const digits = working.replace(/\D/g, '');

  // Keep leading '+' only if it was a real prefix
  const normalized = working.startsWith('+') ? `+${digits}` : digits;

  if (!normalized.startsWith('+')) return { ok: false, code: 'MISSING_COUNTRY_CODE' };

  // E.164: up to 15 digits total (excluding '+'), and cannot start with 0
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return { ok: false, code: 'INVALID_FORMAT' };

  return { ok: true, phone: normalized };
}

