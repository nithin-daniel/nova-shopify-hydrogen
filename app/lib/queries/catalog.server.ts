/**
 * Storefront API documents. Kept in a `.server.ts` module so `gql()` calls never
 * reach the browser bundle (skill: hydrogen-storefront-client). Components import
 * only the derived *types*.
 *
 * Every catalog query declares `$country`/`$language` with `@inContext`, so the
 * client fills them from the request's market automatically.
 */
import { gql, type StorefrontApi } from "@shopify/hydrogen";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    handle
    title
    vendor
    productType
    availableForSale
    tags
    featuredImage { url altText width height }
    images(first: 2) { nodes { url altText width height } }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      maxVariantPrice { amount currencyCode }
    }
    options(first: 3) {
      name
      optionValues { name swatch { color } }
    }
    selectedOrFirstAvailableVariant(selectedOptions: [], ignoreUnknownOptions: true) {
      id
      title
      availableForSale
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
    variantsCount { count }
    rating: metafield(namespace: "reviews", key: "rating") { value }
    ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
  }
`);

const PRODUCT_CARD_SHAPE = gql(`query ProductCardShape { products(first: 1) { nodes { ...ProductCard } } }`, [PRODUCT_CARD_FRAGMENT]);
export type ProductCardData = StorefrontApi.ResultOf<typeof PRODUCT_CARD_SHAPE>["products"]["nodes"][number];

export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    id
    handle
    title
    description
    image { url altText width height }
    kicker: metafield(namespace: "nova", key: "kicker") { value }
  }
`);
const COLLECTION_CARD_SHAPE = gql(`query CollectionCardShape { collections(first: 1) { nodes { ...CollectionCard } } }`, [COLLECTION_CARD_FRAGMENT]);
export type CollectionCardData = StorefrontApi.ResultOf<typeof COLLECTION_CARD_SHAPE>["collections"]["nodes"][number];

/** Root layout: shop identity and navigation collections. */
export const LAYOUT_QUERY = gql(`
  query Layout($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    shop {
      name
      description
      primaryDomain { url }
      paymentSettings { currencyCode }
    }
    localization {
      country { isoCode name currency { isoCode symbol } }
      language { isoCode name }
    }
    collections(first: 12) { nodes { id handle title } }
  }
`);

export const HOME_QUERY = gql(
  `
  query Home($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    collections(first: 12) { nodes { ...CollectionCard } }
    bestSellers: products(first: 8, sortKey: BEST_SELLING) { nodes { ...ProductCard } }
    newest: products(first: 8, sortKey: CREATED_AT, reverse: true) { nodes { ...ProductCard } }
    hero: product(handle: "halo-anc-headphones") { ...ProductCard description }
    feature: product(handle: "keyframe-75-keyboard") { ...ProductCard description }
    articles(first: 3, sortKey: PUBLISHED_AT, reverse: true) {
      nodes { id handle title excerpt publishedAt image { url altText width height } blog { handle } }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export const COLLECTIONS_INDEX_QUERY = gql(
  `
  query CollectionsIndex($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    collections(first: 50) { nodes { ...CollectionCard products(first: 3) { nodes { id } } } }
  }
`,
  [COLLECTION_CARD_FRAGMENT],
);

export const COLLECTION_QUERY = gql(
  `
  query Collection(
    $handle: String!
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CollectionCard
      descriptionHtml
      seo { title description }
      products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        nodes { ...ProductCard }
        pageInfo { hasNextPage endCursor }
        filters {
          id
          label
          type
          presentation
          values { id label count input swatch { color } }
        }
      }
    }
    localization { country { currency { isoCode } } }
  }
`,
  [COLLECTION_CARD_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export const SEARCH_QUERY = gql(
  `
  query Search(
    $term: String!
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(query: $term, first: $first, after: $after, productFilters: $filters, sortKey: $sortKey, reverse: $reverse, types: [PRODUCT], unavailableProducts: LAST) {
      totalCount
      nodes { ... on Product { ...ProductCard } }
      pageInfo { hasNextPage endCursor }
      productFilters {
        id
        label
        type
        presentation
        values { id label count input swatch { color } }
      }
    }
    collections(first: 20) { nodes { ...CollectionCard } }
    localization { country { currency { isoCode } } }
  }
`,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

/** Fallback merchandising for empty / no-result states. */
export const DISCOVERY_QUERY = gql(
  `
  query Discovery($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) { nodes { ...ProductCard } }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

export const PRODUCT_BY_HANDLE_CARD_QUERY = gql(
  `
  query ProductCardByHandle($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    product(handle: $handle) { ...ProductCard }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

export const SITEMAP_QUERY = gql(`
  query Sitemap {
    products(first: 250) { nodes { handle updatedAt } }
    collections(first: 250) { nodes { handle updatedAt } }
    pages(first: 50) { nodes { handle updatedAt } }
    blogs(first: 10) { nodes { handle articles(first: 100) { nodes { handle publishedAt } } } }
  }
`);

