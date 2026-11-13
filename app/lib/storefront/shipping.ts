/**
 * Free-shipping thresholds per presentment currency (CUSTOM merchandising,
 * mirrors the mock store's shipping profile). Values are minor units.
 */
export const FREE_SHIPPING_THRESHOLD_MINOR: Record<string, number> = {
  USD: 15000,
  CAD: 20000,
  GBP: 12000,
  EUR: 14000,
  AUD: 22000,
  JPY: 2200000,
};

const toMinor = (amount: string) => Math.round(Number(amount) * 100);

/**
 * Progress toward free shipping from the server-provided subtotal. This is a
 * presentation estimate for a progress bar, never a total shown as a price.
 */
export function freeShippingProgress(subtotal: { amount: string; currencyCode: string } | null | undefined) {
  if (!subtotal) return null;
  const threshold = FREE_SHIPPING_THRESHOLD_MINOR[subtotal.currencyCode];
  if (!threshold) return null;
  const current = toMinor(subtotal.amount);
  const remainingMinor = Math.max(0, threshold - current);
  return {
    ratio: Math.min(1, current / threshold),
    reached: remainingMinor === 0,
    remaining: { amount: (remainingMinor / 100).toFixed(2), currencyCode: subtotal.currencyCode },
  };
}
