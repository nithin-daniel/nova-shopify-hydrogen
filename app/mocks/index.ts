/**
 * Entry point for the NOVA mock dataset.
 *
 * SERVER ONLY. Only the mock API adapters in `app/lib/mock-api` import this
 * module. UI code reads data through the Storefront API / Customer Account API
 * clients, so the same components work unchanged against a real store.
 */
import { COLLECTIONS } from "./collections";
import { CUSTOMERS } from "./customers";
import { AUTOMATIC_DISCOUNTS, DISCOUNT_CODES, GIFT_CARDS } from "./discounts";
import { ORDERS } from "./orders";
import { ALL_PRODUCTS, PRODUCTS } from "./products";
import { RATINGS, REVIEWS } from "./reviews";
import { BLOG, MARKETS, MENUS, PAGES, POLICIES, POPULAR_SEARCHES, SHIPPING_RATES, SHOP, TAX_EXAMPLES } from "./store";
import type { MockCollection, MockProduct, MockVariant } from "./types";

export * from "./types";
export {
  ALL_PRODUCTS,
  AUTOMATIC_DISCOUNTS,
  BLOG,
  COLLECTIONS,
  CUSTOMERS,
  DISCOUNT_CODES,
  GIFT_CARDS,
  MARKETS,
  MENUS,
  ORDERS,
  PAGES,
  POLICIES,
  POPULAR_SEARCHES,
  PRODUCTS,
  RATINGS,
  REVIEWS,
  SHIPPING_RATES,
  SHOP,
  TAX_EXAMPLES,
};

const productsByHandle = new Map(ALL_PRODUCTS.map((p) => [p.handle, p]));
const productsById = new Map(ALL_PRODUCTS.map((p) => [p.id, p]));
const variantsById = new Map<string, { product: MockProduct; variant: MockVariant }>();
for (const product of ALL_PRODUCTS) {
  for (const variant of product.variants) variantsById.set(variant.id, { product, variant });
}

export const findProduct = (handle: string) => productsByHandle.get(handle);
export const findProductById = (id: string) => productsById.get(id);
export const findVariant = (id: string) => variantsById.get(id);
export const findCollection = (handle: string) => COLLECTIONS.find((c) => c.handle === handle);
export const findCustomer = (id: string) => CUSTOMERS.find((c) => c.id === id);
export const findMarket = (countryCode: string) => MARKETS.find((m) => m.countryCode === countryCode) ?? MARKETS[0];

/** Products in a collection, in merchandised (`COLLECTION_DEFAULT`) order. */
export function collectionProducts(collection: MockCollection): MockProduct[] {
  if (collection.productHandles) {
    return collection.productHandles.map((h) => productsByHandle.get(h)).filter((p): p is MockProduct => Boolean(p));
  }
  const rule = collection.rule ?? (() => false);
  return PRODUCTS.filter(rule).sort((a, b) => a.salesRank - b.salesRank);
}

export function productCollections(product: MockProduct): MockCollection[] {
  return COLLECTIONS.filter((c) => collectionProducts(c).some((p) => p.handle === product.handle));
}

/** A representative cart used by documentation and the lab "load sample cart" demo. */
export const SAMPLE_CART_LINES = [
  { variantId: "48800000100", quantity: 1 }, // Halo ANC Headphones, Graphite
  { variantId: "48800001500", quantity: 1 }, // Arc Laptop Stand, Graphite
  { variantId: "48800002300", quantity: 2 }, // Pebble Ceramic Mug, Bone
];
