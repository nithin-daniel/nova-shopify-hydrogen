/**
 * Domain types for the NOVA mock dataset.
 *
 * These are *business* fixtures, deliberately not shaped like Storefront API
 * responses. The mock Storefront API (`app/lib/mock-api`) is the only code that
 * reads them, and it maps them into real Storefront API / Customer Account API
 * response shapes. UI components never import from `app/mocks` directly.
 *
 * Money is stored as integer cents in the store's base currency (USD) so the
 * adapter never does floating point currency math.
 */
import type { MockImageAsset } from "./images";

export type Cents = number;

export type MockImage = MockImageAsset & { alt: string };

export type MockOptionValue = {
  name: string;
  /** Hex colour for colour swatches (Storefront API `ProductOptionValueSwatch.color`). */
  swatch?: string;
};

export type MockOption = { name: string; values: MockOptionValue[] };

export type MockVariant = {
  /** Numeric id. The adapter exposes it as `gid://shopify/ProductVariant/{id}`. */
  id: string;
  sku: string;
  /** Option name → value. Must cover every product option. */
  options: Record<string, string>;
  price: Cents;
  compareAtPrice?: Cents;
  /** Units on hand. 0 = sold out unless `continueSellingWhenOutOfStock`. */
  inventory: number;
  continueSellingWhenOutOfStock?: boolean;
  /** Index into the product's `images` used as the variant image. */
  imageIndex?: number;
  weightGrams?: number;
  barcode?: string;
};

export type ProductDetails = {
  highlights: string[];
  materials: string;
  dimensions: string;
  inTheBox: string[];
  care: string;
  warranty: string;
};

export type MockProduct = {
  /** Numeric id. Exposed as `gid://shopify/Product/{id}`. */
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  /** One-line editorial summary used on cards and meta descriptions. */
  summary: string;
  descriptionHtml: string;
  options: MockOption[];
  variants: MockVariant[];
  images: MockImage[];
  createdAt: string;
  /** 1 = best seller. Drives `BEST_SELLING` sort. */
  salesRank: number;
  details: ProductDetails;
  /** Handles of related products (Storefront API `productRecommendations(intent: RELATED)`). */
  related: string[];
  /** Handles bought together (Storefront API `productRecommendations(intent: COMPLEMENTARY)`). */
  complementary: string[];
  isGiftCard?: boolean;
  requiresSellingPlan?: boolean;
  seo?: { title?: string; description?: string };
};

export type MockReview = {
  id: string;
  productHandle: string;
  author: string;
  location: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  createdAt: string;
  verifiedBuyer: boolean;
};

export type MockCollection = {
  id: string;
  handle: string;
  title: string;
  /** Short eyebrow shown above the title. */
  kicker: string;
  descriptionHtml: string;
  image: MockImage;
  /** Manual collection: explicit product handles in merchandised order. */
  productHandles?: string[];
  /** Smart collection: rule evaluated against every product. */
  rule?: (product: MockProduct) => boolean;
  /** Category collections appear in navigation; curated ones are editorial. */
  kind: "category" | "curated";
  seo?: { title?: string; description?: string };
};

export type MockAddress = {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  zip: string;
  country: string;
  countryCode: string;
  phone?: string;
};

export type MockCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  acceptsMarketing: boolean;
  createdAt: string;
  tags: string[];
  /** Short persona used by the demo login picker. */
  persona: string;
  addresses: MockAddress[];
  defaultAddressId?: string;
};

export type FinancialStatus = "PAID" | "PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED" | "AUTHORIZED";

export type FulfillmentEventStatus =
  | "LABEL_PRINTED"
  | "CONFIRMED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "ATTEMPTED_DELIVERY"
  | "FAILURE";

export type MockFulfillment = {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  /** Line indexes (into the order's lineItems) shipped in this fulfillment. */
  lineIndexes: number[];
  status: "SUCCESS" | "OPEN" | "CANCELLED";
  latestShipmentStatus: FulfillmentEventStatus;
  estimatedDeliveryAt?: string;
  events: { status: FulfillmentEventStatus; happenedAt: string; message: string; location?: string }[];
};

export type MockOrderLine = {
  productHandle: string;
  variantId: string;
  quantity: number;
  /** Unit price charged, in cents. */
  price: Cents;
  /** Line-level discount applied, in cents. */
  discount?: Cents;
};

export type MockOrder = {
  id: string;
  number: number;
  customerId: string;
  processedAt: string;
  financialStatus: FinancialStatus;
  /** Derived for the UI; Customer Account API exposes fulfillments separately. */
  fulfillmentStatus: "FULFILLED" | "UNFULFILLED" | "PARTIALLY_FULFILLED" | "ON_HOLD" | "CANCELLED";
  cancelledAt?: string;
  cancelReason?: string;
  currencyCode: "USD" | "CAD" | "GBP" | "EUR";
  lineItems: MockOrderLine[];
  discountCode?: string;
  orderDiscount?: Cents;
  shippingMethod: string;
  shipping: Cents;
  tax: Cents;
  refunded?: Cents;
  shippingAddressId: string;
  note?: string;
  fulfillments: MockFulfillment[];
};

export type DiscountRule =
  | { kind: "percentage"; percent: number }
  | { kind: "fixed"; amount: Cents }
  | { kind: "free_shipping" };

export type MockDiscountCode = {
  code: string;
  title: string;
  description: string;
  rule: DiscountRule;
  /** Minimum cart subtotal in cents (before this discount). */
  minimumSubtotal?: Cents;
  /** Only these product handles are eligible (line-level allocation). */
  eligibleProductHandles?: string[];
  /** Only products in these collections are eligible. */
  eligibleCollectionHandles?: string[];
  startsAt: string;
  endsAt?: string;
  /** One-per-customer or similar restriction, shown as a demo scenario. */
  usageNote?: string;
  combinesWithOtherCodes: boolean;
};

export type MockAutomaticDiscount = {
  id: string;
  title: string;
  description: string;
  /** All these product handles must be in the cart. */
  requiresAllOf: string[];
  /** Percentage applied to the qualifying lines. */
  percent: number;
};

export type MockGiftCard = {
  code: string;
  balance: Cents;
  currencyCode: "USD";
  expiresOn?: string;
  enabled: boolean;
  note: string;
};

export type MockMarket = {
  countryCode: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  /** Presentment rate applied to USD base prices. */
  rate: number;
  /** Shopify Markets style rounding of converted prices. */
  rounding: "none" | "whole" | "ninety_five" | "ninety_nine";
  languages: string[];
  /** Whether listed prices include tax (VAT markets). */
  taxIncluded: boolean;
  freeShippingThreshold: Cents;
};

export type MockShippingRate = {
  handle: string;
  title: string;
  /** Countries the rate applies to. */
  countries: string[];
  price: Cents;
  /** Free when the cart subtotal reaches the market threshold. */
  freeOverThreshold: boolean;
  minDays: number;
  maxDays: number;
};

export type MockTaxExample = {
  region: string;
  countryCode: string;
  provinceCode?: string;
  rate: number;
  label: string;
  included: boolean;
  note: string;
};

export type MockPage = {
  id: string;
  handle: string;
  title: string;
  bodySummary: string;
  body: string;
  seo?: { title?: string; description?: string };
};

export type MockArticle = {
  id: string;
  handle: string;
  title: string;
  author: string;
  publishedAt: string;
  excerpt: string;
  contentHtml: string;
  image: MockImage;
  tags: string[];
  relatedProductHandles: string[];
};

export type MockBlog = {
  id: string;
  handle: string;
  title: string;
  description: string;
  articles: MockArticle[];
};

export type MockPolicy = {
  id: string;
  handle: "privacy-policy" | "refund-policy" | "shipping-policy" | "terms-of-service";
  title: string;
  body: string;
};

export type MockMenuItem = { title: string; url: string; items?: MockMenuItem[] };
