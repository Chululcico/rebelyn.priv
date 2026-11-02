/** Utilidades de dinero. Todo se guarda y calcula en céntimos de euro. */

export function formatMoney(cents: number, currency = "EUR", locale = "es-ES"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function percentOff(priceCents: number, compareAtCents?: number | null): number {
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}

export function isOnSale(priceCents: number, compareAtCents?: number | null): boolean {
  return Boolean(compareAtCents && compareAtCents > priceCents);
}
