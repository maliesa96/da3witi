export const PROMO_END = new Date('2026-06-10T21:00:00Z');
export const PROMO_COUPON_ID = 'fzSZdKbw';

export function isPromoActive() {
  return Date.now() < PROMO_END.getTime();
}
