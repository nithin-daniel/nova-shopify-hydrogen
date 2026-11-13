import { gql } from "@shopify/hydrogen";

/** Gift cards are not wrapped by Hydrogen's cart handlers; the /cart action runs this directly. */
export const CART_GIFT_CARD_CODES_UPDATE = gql(`
  mutation CartGiftCardCodesUpdate($cartId: ID!, $giftCardCodes: [String!]!) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart { id appliedGiftCards { id lastCharacters } }
      userErrors { code field message }
    }
  }
`);

export const CART_GIFT_CARD_CODES_REMOVE = gql(`
  mutation CartGiftCardCodesRemove($cartId: ID!, $appliedGiftCardIds: [ID!]!) {
    cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
      cart { id }
      userErrors { code field message }
    }
  }
`);
