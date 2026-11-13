/**
 * Hydrogen handler groups, created once at module scope and registered with
 * `handleShopifyRoutes` in the root middleware. Client bindings import their
 * *types* only (`import type`), so no server code reaches the browser.
 */
import { createCartServerHandlers, createPredictiveSearchServerHandlers, gql } from "@shopify/hydrogen";

/**
 * Extra cart fields on top of Hydrogen's base cart fragment:
 * - discount allocations (line-level and cart-level) for discount UI
 * - applied gift cards
 * - compare-at prices for "you save" on lines
 */
const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    buyerIdentity { countryCode }
    discountAllocations {
      discountedAmount { amount currencyCode }
      ... on CartCodeDiscountAllocation { code }
      ... on CartAutomaticDiscountAllocation { title }
    }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed { amount currencyCode }
      balance { amount currencyCode }
    }
    lines(first: 250) {
      nodes {
        id
        discountAllocations {
          discountedAmount { amount currencyCode }
          ... on CartCodeDiscountAllocation { code }
          ... on CartAutomaticDiscountAllocation { title }
        }
        merchandise {
          ... on ProductVariant {
            id
            availableForSale
            compareAtPrice { amount currencyCode }
          }
        }
      }
    }
  }
`);

export const cartHandlers = createCartServerHandlers({ fragment: CART_FRAGMENT });

export const predictiveSearchFragments = {
  product: gql(`
    fragment PredictiveSearchProductFragment on Product {
      vendor
      productType
      availableForSale
    }
  `),
};

export const predictiveSearchHandlers = createPredictiveSearchServerHandlers({ fragments: predictiveSearchFragments });
