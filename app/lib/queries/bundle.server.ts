import { gql } from "@shopify/hydrogen";
import { PRODUCT_CARD_FRAGMENT } from "./catalog.server";

export const BUNDLE_QUERY = gql(
  `
  query Bundle($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    listen: collection(handle: "sound") { products(first: 12, sortKey: BEST_SELLING) { nodes { ...ProductCard } } }
    work: collection(handle: "desk") { products(first: 12, sortKey: BEST_SELLING) { nodes { ...ProductCard } } }
    light: collection(handle: "light") { products(first: 12, sortKey: BEST_SELLING) { nodes { ...ProductCard } } }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);
