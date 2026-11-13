import { gql } from "@shopify/hydrogen";

export const LAB_PRICE_QUERY = gql(`
  query LabPrice($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    product(handle: $handle) { title priceRange { minVariantPrice { amount currencyCode } } }
    localization { country { isoCode name currency { isoCode symbol } } language { isoCode endonymName } }
  }
`);

export const LAB_TIMING_QUERY = gql(`
  query LabTiming($country: CountryCode) @inContext(country: $country) {
    products(first: 20) { nodes { id title } }
  }
`);
