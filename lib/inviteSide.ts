/**
 * Invitation side designation for guests.
 * null = Unassigned (legacy/default)
 */
export type InviteSide = 'bride' | 'groom';

export const INVITE_SIDES: InviteSide[] = ['bride', 'groom'];

export type InviteSideOrAll = InviteSide | 'all';

/**
 * Normalize raw input to a valid InviteSide or null.
 */
export function normalizeInviteSide(value: unknown): InviteSide | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase().trim();
  if (lower === 'bride' || lower === 'groom') return lower;
  // Arabic normalization
  if (lower === 'عروس' || lower === 'عروسة') return 'bride';
  if (lower === 'عريس' || lower === 'معرس' || lower === 'المعرس') return 'groom';
  return null;
}

/**
 * Validate that a value is a valid InviteSide (for server actions).
 */
export function isValidInviteSide(value: unknown): value is InviteSide {
  return value === 'bride' || value === 'groom';
}

/**
 * Get the localized label for an invite side.
 */
export function getInviteSideLabel(
  side: InviteSide | null,
  t: (key: string) => string
): string {
  if (side === 'bride') return t('side_bride');
  if (side === 'groom') return t('side_groom');
  return t('side_unassigned');
}
