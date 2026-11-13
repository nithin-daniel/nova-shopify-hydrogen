/**
 * Shopify Markets definition. `define*` helpers return serializable,
 * module-scope config, so this file is safe to import from server and client.
 *
 * Pathname routing: the default locale (EN-US) is unprefixed; other markets are
 * served under /en-ca, /en-gb, /fr-fr, /en-au and /ja-jp. Extra fields (label,
 * currency, locale) survive on `requestContext.locale` and `getSupportedLocales`.
 */
import { defineShopifyI18n } from "@shopify/hydrogen";

export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US", label: "United States", currency: "USD", intlLocale: "en-US" },
  routing: {
    type: "pathname",
    locales: [
      { language: "EN", country: "CA", label: "Canada", currency: "CAD", intlLocale: "en-CA" },
      { language: "EN", country: "GB", label: "United Kingdom", currency: "GBP", intlLocale: "en-GB" },
      { language: "FR", country: "FR", label: "France", currency: "EUR", intlLocale: "fr-FR" },
      { language: "EN", country: "AU", label: "Australia", currency: "AUD", intlLocale: "en-AU" },
      { language: "JA", country: "JP", label: "日本", currency: "JPY", intlLocale: "ja-JP" },
    ],
  },
});

/** Serializable locale shape the root loader sends to the browser. */
export type AppLocale = {
  language: string;
  country: string;
  pathPrefix: string;
  label: string;
  currency: string;
  intlLocale: string;
};
