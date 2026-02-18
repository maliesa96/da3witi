export const RAMADAN_PROMO_END = new Date('2026-02-25T21:00:00Z');
export const RAMADAN_COUPON_ID = 'XKIYVXhA';

export function isRamadanPromoActive() {
  return Date.now() < RAMADAN_PROMO_END.getTime();
}
