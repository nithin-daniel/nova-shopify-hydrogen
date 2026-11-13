import { gql } from "@shopify/hydrogen";
import { PRODUCT_CARD_FRAGMENT } from "./catalog.server";

export const PAGE_QUERY = gql(`
  query Page($handle: String!, $language: LanguageCode) @inContext(language: $language) {
    page(handle: $handle) { id handle title body bodySummary seo { title description } }
  }
`);

export const POLICY_QUERY = gql(`
  query Policies($language: LanguageCode) @inContext(language: $language) {
    shop {
      privacyPolicy { id handle title body }
      refundPolicy { id handle title body }
      shippingPolicy { id handle title body }
      termsOfService { id handle title body }
    }
  }
`);

export const BLOG_QUERY = gql(`
  query Blog($handle: String!, $first: Int!, $language: LanguageCode) @inContext(language: $language) {
    blog(handle: $handle) {
      id handle title seo { description }
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        nodes { id handle title excerpt publishedAt tags author: authorV2 { name } image { url altText width height } }
      }
    }
  }
`);

export const ARTICLE_QUERY = gql(
  `
  query Article($blogHandle: String!, $articleHandle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      handle
      title
      articleByHandle(handle: $articleHandle) {
        id handle title contentHtml excerpt publishedAt tags
        author: authorV2 { name }
        image { url altText width height }
        seo { title description }
        related: metafield(namespace: "nova", key: "related_products") { value }
      }
    }
    products(first: 40) { nodes { ...ProductCard } }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);
