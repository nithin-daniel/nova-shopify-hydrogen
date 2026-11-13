/**
 * Customer Account API documents (typed by `gql` from
 * `@shopify/hydrogen/customer-account`, validated by `hydrogen gql check`).
 * DEMO_MODE executes them against the mock CAAPI; live mode against Shopify.
 */
import { gql, type CustomerAccountDocument } from "@shopify/hydrogen/customer-account";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultOf<D> = D extends CustomerAccountDocument<infer R, any, string> ? R : never;

const ADDRESS_FIELDS = gql(`
  fragment AddressFields on CustomerAddress {
    id firstName lastName company address1 address2 city zoneCode zip territoryCode phoneNumber
    formatted(withName: true, withCompany: true)
  }
`);

export const CUSTOMER_QUERY = gql(
  `
  query AccountCustomer {
    customer {
      id
      firstName
      lastName
      displayName
      creationDate
      tags
      emailAddress { emailAddress marketingState }
      phoneNumber { phoneNumber }
      defaultAddress { ...AddressFields }
      addresses(first: 20) { nodes { ...AddressFields } }
      orders(first: 3, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id name processedAt financialStatus fulfillmentStatus
          totalPrice { amount currencyCode }
          lineItems(first: 4) { nodes { id title image { url altText width height } } }
        }
      }
    }
  }
`,
  [ADDRESS_FIELDS],
);
export type AccountCustomer = NonNullable<ResultOf<typeof CUSTOMER_QUERY>["customer"]>;

export const ORDERS_QUERY = gql(`
  query AccountOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id name processedAt financialStatus fulfillmentStatus cancelledAt
          totalPrice { amount currencyCode }
          lineItems(first: 4) { nodes { id title quantity image { url altText width height } } }
          fulfillments(first: 5) { nodes { latestShipmentStatus } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

export const ORDER_QUERY = gql(`
  query AccountOrder($id: ID!) {
    order(id: $id) {
      id name confirmationNumber processedAt cancelledAt cancelReason note
      financialStatus fulfillmentStatus currencyCode statusPageUrl
      subtotal { amount currencyCode }
      totalShipping { amount currencyCode }
      totalTax { amount currencyCode }
      totalPrice { amount currencyCode }
      totalRefunded { amount currencyCode }
      shippingLine { title }
      shippingAddress { formatted(withName: true) }
      discountApplications(first: 5) {
        nodes {
          ... on DiscountCodeApplication { code }
          value { ... on MoneyV2 { amount currencyCode } ... on PricingPercentageValue { percentage } }
        }
      }
      lineItems(first: 50) {
        nodes {
          id title variantTitle quantity sku
          image { url altText width height }
          price { amount currencyCode }
          totalPrice { amount currencyCode }
          totalDiscount { amount currencyCode }
        }
      }
      fulfillments(first: 10) {
        nodes {
          id status latestShipmentStatus estimatedDeliveryAt
          trackingInformation { company number url }
          events(first: 20) { nodes { id status happenedAt } }
          fulfillmentLineItems(first: 50) { nodes { quantity lineItem { title } } }
        }
      }
    }
  }
`);
export type AccountOrder = NonNullable<ResultOf<typeof ORDER_QUERY>["order"]>;

export const CUSTOMER_UPDATE = gql(`
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) { customer { firstName lastName } userErrors { field message } }
  }
`);

export const ADDRESS_CREATE = gql(`
  mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) { customerAddress { id } userErrors { field message } }
  }
`);

export const ADDRESS_UPDATE = gql(`
  mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) { customerAddress { id } userErrors { field message } }
  }
`);

export const ADDRESS_DELETE = gql(`
  mutation AddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) { deletedAddressId userErrors { field message } }
  }
`);
