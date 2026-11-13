import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { PRODUCT_CARD_FRAGMENT } from "./catalog.server";

/**
 * One reusable VariantFields fragment shared by firstSelectableVariant,
 * selectedOrFirstAvailableVariant and adjacentVariants (skill: hydrogen-setup
 * step 6). `quantityAvailable` needs the `unauthenticated_read_product_inventory`
 * scope on real stores, so it is opt-in via `$withInventory`.
 */
export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    currentlyNotInStock
    quantityAvailable @include(if: $withInventory)
    selectedOptions { name value }
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    image { url altText width height }
    product { title handle }
    sku
  }
`);

export const PRODUCT_QUERY = gql(
  `
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $withInventory: Boolean!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      productType
      description
      descriptionHtml
      requiresSellingPlan
      isGiftCard
      tags
      seo { title description }
      options {
        name
        optionValues {
          name
          firstSelectableVariant { ...VariantFields }
          swatch {
            color
            image { ... on MediaImage { image { url altText } } }
          }
        }
      }
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...VariantFields
      }
      adjacentVariants(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...VariantFields
      }
      media(first: 10) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage { image { url altText width height } }
          previewImage { url altText width height }
        }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      rating: metafield(namespace: "reviews", key: "rating") { value }
      ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
      details: metafield(namespace: "nova", key: "details") { value }
      collections(first: 3) { nodes { handle title } }
    }
    shop { shippingPolicy { title handle } refundPolicy { title handle } }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;
export type ProductVariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

export const RECOMMENDATIONS_QUERY = gql(
  `
  query ProductRecommendations($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    related: productRecommendations(productHandle: $handle, intent: RELATED) { ...ProductCard }
    complementary: productRecommendations(productHandle: $handle, intent: COMPLEMENTARY) { ...ProductCard }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

/** Quick view: lighter product query for the modal (no recommendations). */
export const QUICK_VIEW_QUERY = PRODUCT_QUERY;
