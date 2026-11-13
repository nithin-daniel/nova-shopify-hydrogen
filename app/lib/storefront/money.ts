import { formatMoney, type MoneyV2 } from "@shopify/hydrogen";

/** Formats Storefront API money with Hydrogen's formatter in the active market locale. */
export function formatPrice(money: MoneyV2 | null | undefined, locale = "en-US", options: { trim?: boolean } = {}) {
  if (!money) return "";
  const formatted = formatMoney(money, { locale });
  return options.trim ? formatted.withoutTrailingZeros : formatted.toString();
}

export function formatPriceRange(min: MoneyV2, max: MoneyV2, locale = "en-US") {
  if (min.amount === max.amount) return formatPrice(min, locale, { trim: true });
  return formatMoney([min, max], { locale, withoutTrailingZeros: true }).toString();
}

/** True when a compare-at price is strictly higher (string compare via numbers is display-only). */
export function isDiscounted(price?: MoneyV2 | null, compareAt?: MoneyV2 | null) {
  return Boolean(price && compareAt && Number(compareAt.amount) > Number(price.amount));
}
