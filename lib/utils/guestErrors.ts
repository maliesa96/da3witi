import { MAX_GUESTS_PER_EVENT } from '@/lib/limits';

export type GuestError =
  | { code: 'DUPLICATE_PHONE'; phone: string }
  | { code: 'GUEST_LIMIT_EXCEEDED'; remaining: number; max: number }
  | { code: 'GUEST_LIMIT_ZERO'; max: number }
  | { code: 'INVALID_PHONE' }
  | { code: 'NAME_TOO_SHORT' }
  | { code: 'INVALID_INVITE_COUNT' }
  | { code: 'MESSAGE_TOO_LONG' }
  | { code: 'MESSAGE_INVALID_TEXT'; violation: string }
  | { code: 'UNKNOWN'; message: string };

/**
 * Parse a guest error (thrown Error, returned action error string, or unknown) into a structured object.
 */
export function parseGuestError(error: unknown): GuestError {
  const msg =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error);

  if (msg.includes('DUPLICATE_PHONE')) {
    const phone = msg.split(':').slice(1).join(':') || '';
    return { code: 'DUPLICATE_PHONE', phone };
  }

  if (msg.includes('GUEST_LIMIT_EXCEEDED')) {
    const remaining = parseInt(msg.split(':')[1] || '0', 10);
    if (remaining <= 0) {
      return { code: 'GUEST_LIMIT_ZERO', max: MAX_GUESTS_PER_EVENT };
    }
    return { code: 'GUEST_LIMIT_EXCEEDED', remaining, max: MAX_GUESTS_PER_EVENT };
  }

  if (msg.includes('INVALID_PHONE')) return { code: 'INVALID_PHONE' };
  if (msg.includes('NAME_TOO_SHORT')) return { code: 'NAME_TOO_SHORT' };
  if (msg.includes('INVALID_INVITE_COUNT')) return { code: 'INVALID_INVITE_COUNT' };
  if (msg.includes('MESSAGE_INVALID_TEXT')) {
    const violation = msg.split(':').slice(1).join(':') || 'newline';
    return { code: 'MESSAGE_INVALID_TEXT', violation };
  }
  if (msg.includes('MESSAGE_TOO_LONG')) return { code: 'MESSAGE_TOO_LONG' };

  return { code: 'UNKNOWN', message: msg };
}

/**
 * Convert a parsed guest error into a user-facing translated message.
 *
 * @param error  – structured error from `parseGuestError`
 * @param t      – a translation function bound to the "GuestErrors" namespace
 *                 (i.e. `useTranslations('GuestErrors')`)
 */
export function guestErrorMessage(
  error: GuestError,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  switch (error.code) {
    case 'DUPLICATE_PHONE':
      return t('duplicate_phone', { phone: error.phone });
    case 'GUEST_LIMIT_EXCEEDED':
      return t('guest_limit_exceeded', { remaining: error.remaining, max: error.max });
    case 'GUEST_LIMIT_ZERO':
      return t('guest_limit_zero', { max: error.max });
    case 'INVALID_PHONE':
      return t('invalid_phone');
    case 'NAME_TOO_SHORT':
      return t('name_too_short');
    case 'INVALID_INVITE_COUNT':
      return t('invalid_invite_count');
    case 'MESSAGE_TOO_LONG':
      return t('message_too_long');
    case 'MESSAGE_INVALID_TEXT': {
      const keyMap: Record<string, string> = {
        newline: 'message_invalid_newline',
        tab: 'message_invalid_tab',
        spaces: 'message_invalid_spaces',
      };
      return t(keyMap[error.violation] ?? 'message_invalid_newline');
    }
    case 'UNKNOWN':
      return t('unknown');
  }
}
