/**
 * Catalog resolvers for the mock Storefront API: maps NOVA fixtures to real
 * Storefront API objects (Product, ProductVariant, Collection, Filter, ...).
 */
import {
  ALL_PRODUCTS,
  COLLECTIONS,
  PRODUCTS,
  RATINGS,
  collectionProducts,
  findMarket,
  productCollections,
  type Cents,
  type MockCollection,
  type MockImage,
  type MockMarket,
  type MockProduct,
  type MockVariant,
} from "~/mocks";
import { connection, gid, stripHtml, type ConnectionArgs, type MockRequestContext } from "../graphql.server";

// ---------------------------------------------------------------------------
// Money (Shopify Markets style presentment pricing)
// ---------------------------------------------------------------------------

const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

/** Converts a USD base price in cents into the market's presentment amount (major units). */
export function presentmentAmount(cents: Cents, market: MockMarket): number {
  const major = (cents / 100) * market.rate;
  if (market.rate === 1) return cents / 100;
  if (ZERO_DECIMAL.has(market.currencyCode)) return Math.ceil(major);
  switch (market.rounding) {
    case "whole":
      return Math.ceil(major);
    case "ninety_five":
      return Math.floor(major) + 0.95;
    case "ninety_nine":
      return Math.floor(major) + 0.99;
    default:
      return Math.round(major * 100) / 100;
  }
}

/** Formats a major-unit number the way the Storefront API serialises `Decimal` ("299.0"). */
export const decimal = (major: number) => (Number.isInteger(major) ? `${major}.0` : String(Math.round(major * 100) / 100));

export const moneyV2 = (major: number, currencyCode: string) => ({ amount: decimal(major), currencyCode });

export function money(cents: Cents, market: MockMarket) {
  return moneyV2(presentmentAmount(cents, market), market.currencyCode);
}

// ---------------------------------------------------------------------------
// Variant matrix encoding (Storefront API `encodedVariantExistence` v1 format)
// ---------------------------------------------------------------------------

type Tree = Map<number, Tree>;

/**
 * Encodes option-value index tuples in Shopify's v1 trie format, e.g.
 * "v1_0:0 1,1:0,". Hydrogen's product form store decodes this to decide which
 * option values exist / are available without any network request.
 */
export function encodeVariantField(product: MockProduct, variants: MockVariant[]): string {
  const root: Tree = new Map();
  for (const variant of variants) {
    let node = root;
    for (const option of product.options) {
      const index = option.values.findIndex((v) => v.name === variant.options[option.name]);
      if (!node.has(index)) node.set(index, new Map());
      node = node.get(index)!;
    }
  }
  const encode = (node: Tree, depth: number): string => {
    const keys = [...node.keys()].sort((a, b) => a - b);
    if (depth === product.options.length - 1) return keys.join(" ");
    return keys.map((k) => `${k}:${encode(node.get(k)!, depth + 1)},`).join("");
  };
  return `v1_${root.size ? encode(root, 0) : ""}`;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

let imageSeq = 0;
const imageIds = new Map<string, string>();
const imageId = (url: string) => {
  if (!imageIds.has(url)) imageIds.set(url, gid("ProductImage", String(40_000_000 + ++imageSeq)));
  return imageIds.get(url)!;
};

export const toImage = (image: MockImage | undefined | null) =>
  image
    ? {
        id: imageId(image.url),
        url: image.url,
        src: image.url,
        originalSrc: image.url,
        transformedSrc: image.url,
        altText: image.alt,
        width: image.width,
        height: image.height,
        thumbhash: null,
      }
    : null;

export const isAvailable = (v: MockVariant) => v.inventory > 0 || Boolean(v.continueSellingWhenOutOfStock);

type SelectedOptionInput = { name: string; value: string };

function matchVariant(
  product: MockProduct,
  selected: SelectedOptionInput[] | undefined,
  { caseInsensitive = false, ignoreUnknown = false } = {},
) {
  if (!selected?.length) return null;
  const eq = (a: string, b: string) => (caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b);
  const known = selected.filter((s) => product.options.some((o) => eq(o.name, s.name)));
  if (!ignoreUnknown && known.length !== selected.length) return null;
  if (known.length !== product.options.length) return null;
  return (
    product.variants.find((v) =>
      known.every((s) => {
        const option = product.options.find((o) => eq(o.name, s.name))!;
        return eq(v.options[option.name], s.value);
      }),
    ) ?? null
  );
}

const firstAvailable = (product: MockProduct) => product.variants.find(isAvailable) ?? product.variants[0] ?? null;

export function toVariant(product: MockProduct, variant: MockVariant, ctx: MockRequestContext) {
  const market = findMarket(ctx.country);
  const image = variant.imageIndex !== undefined ? product.images[variant.imageIndex] : product.images[0];
  return {
    __typename: "ProductVariant",
    id: gid("ProductVariant", variant.id),
    title: product.options.map((o) => variant.options[o.name]).join(" / "),
    sku: variant.sku,
    barcode: variant.barcode ?? null,
    availableForSale: isAvailable(variant),
    currentlyNotInStock: variant.inventory <= 0,
    quantityAvailable: variant.inventory,
    requiresShipping: !product.isGiftCard,
    requiresComponents: false,
    taxable: !product.isGiftCard,
    weight: variant.weightGrams ? variant.weightGrams / 1000 : 0.5,
    weightUnit: "KILOGRAMS",
    selectedOptions: product.options.map((o) => ({ name: o.name, value: variant.options[o.name] })),
    price: money(variant.price, market),
    priceV2: money(variant.price, market),
    compareAtPrice: variant.compareAtPrice ? money(variant.compareAtPrice, market) : null,
    compareAtPriceV2: variant.compareAtPrice ? money(variant.compareAtPrice, market) : null,
    unitPrice: null,
    unitPriceMeasurement: null,
    image: toImage(image),
    product: () => toProduct(product, ctx),
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
    quantityRule: { minimum: 1, maximum: null, increment: 1 },
    quantityPriceBreaks: () => connection([], {}, (x) => x),
    sellingPlanAllocations: () => connection([], {}, (x) => x),
    components: () => connection([], {}, (x) => x),
    groupedBy: () => connection([], {}, (x) => x),
    storeAvailability: () => connection([], {}, (x) => x),
    shopPayInstallmentsPricing: null,
  };
}

function priceRange(product: MockProduct, market: MockMarket, field: "price" | "compareAtPrice") {
  const values = product.variants.map((v) => (field === "price" ? v.price : (v.compareAtPrice ?? v.price)));
  return {
    minVariantPrice: money(Math.min(...values), market),
    maxVariantPrice: money(Math.max(...values), market),
  };
}

function productMetafield(product: MockProduct, namespace: string, key: string) {
  const rating = RATINGS[product.handle];
  const base = { id: gid("Metafield", `${product.id}-${namespace}-${key}`), namespace, key, description: null, createdAt: product.createdAt, updatedAt: product.createdAt, reference: null, references: null, parentResource: null };
  if (namespace === "reviews" && key === "rating" && rating) {
    return { ...base, type: "rating", value: JSON.stringify({ value: String(rating[0]), scale_min: "1.0", scale_max: "5.0" }) };
  }
  if (namespace === "reviews" && key === "rating_count" && rating) {
    return { ...base, type: "number_integer", value: String(rating[1]) };
  }
  if (namespace === "nova" && key === "details") {
    return { ...base, type: "json", value: JSON.stringify(product.details) };
  }
  if (namespace === "nova" && key === "summary") {
    return { ...base, type: "single_line_text_field", value: product.summary };
  }
  return null;
}

export function toProduct(product: MockProduct, ctx: MockRequestContext): Record<string, unknown> {
  const market = findMarket(ctx.country);
  const variant = (v: MockVariant | null) => (v ? toVariant(product, v, ctx) : null);
  const available = product.variants.filter(isAvailable);
  return {
    __typename: "Product",
    id: gid("Product", product.id),
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    productType: product.productType,
    tags: product.tags,
    description: ({ truncateAt }: { truncateAt?: number }) => {
      const text = stripHtml(product.descriptionHtml);
      return truncateAt && text.length > truncateAt ? `${text.slice(0, truncateAt)}…` : text;
    },
    descriptionHtml: product.descriptionHtml,
    availableForSale: available.length > 0,
    isGiftCard: Boolean(product.isGiftCard),
    requiresSellingPlan: Boolean(product.requiresSellingPlan),
    totalInventory: product.variants.reduce((sum, v) => sum + Math.max(0, v.inventory), 0),
    createdAt: product.createdAt,
    updatedAt: product.createdAt,
    publishedAt: product.createdAt,
    onlineStoreUrl: null,
    category: null,
    trackingParameters: null,
    seo: { title: product.seo?.title ?? null, description: product.seo?.description ?? product.summary },
    featuredImage: toImage(product.images[0]),
    images: (args: ConnectionArgs) => connection(product.images, args, toImage),
    media: (args: ConnectionArgs) =>
      connection(product.images, args, (image) => ({
        __typename: "MediaImage",
        id: gid("MediaImage", imageId(image.url).split("/").pop()!),
        mediaContentType: "IMAGE",
        alt: image.alt,
        image: toImage(image),
        previewImage: toImage(image),
        presentation: null,
      })),
    options: ({ first }: { first?: number }) =>
      product.options.slice(0, first ?? 250).map((option, oi) => ({
        id: gid("ProductOption", `${product.id}${oi}`),
        name: option.name,
        values: option.values.map((v) => v.name),
        optionValues: option.values.map((value, vi) => {
          const matching = product.variants.filter((v) => v.options[option.name] === value.name);
          return {
            id: gid("ProductOptionValue", `${product.id}${oi}${vi}`),
            name: value.name,
            swatch: value.swatch ? { color: value.swatch, image: null } : null,
            firstSelectableVariant: variant(matching.find(isAvailable) ?? matching[0] ?? null),
          };
        }),
      })),
    encodedVariantExistence: encodeVariantField(product, product.variants),
    encodedVariantAvailability: encodeVariantField(product, available),
    selectedOrFirstAvailableVariant: (args: { selectedOptions?: SelectedOptionInput[]; ignoreUnknownOptions?: boolean; caseInsensitiveMatch?: boolean }) =>
      variant(
        matchVariant(product, args.selectedOptions, { caseInsensitive: args.caseInsensitiveMatch ?? false, ignoreUnknown: args.ignoreUnknownOptions ?? false }) ??
          firstAvailable(product),
      ),
    variantBySelectedOptions: (args: { selectedOptions: SelectedOptionInput[]; ignoreUnknownOptions?: boolean; caseInsensitiveMatch?: boolean }) =>
      variant(matchVariant(product, args.selectedOptions, { caseInsensitive: args.caseInsensitiveMatch ?? false, ignoreUnknown: args.ignoreUnknownOptions ?? false })),
    adjacentVariants: (args: { selectedOptions?: SelectedOptionInput[]; ignoreUnknownOptions?: boolean; caseInsensitiveMatch?: boolean }) => {
      const selected =
        matchVariant(product, args.selectedOptions, { caseInsensitive: args.caseInsensitiveMatch ?? false, ignoreUnknown: args.ignoreUnknownOptions ?? false }) ??
        firstAvailable(product);
      if (!selected) return [];
      return product.variants
        .filter((v) => v !== selected && product.options.filter((o) => v.options[o.name] !== selected.options[o.name]).length === 1)
        .map((v) => variant(v));
    },
    variants: (args: ConnectionArgs) => connection(product.variants, args, (v) => toVariant(product, v, ctx)),
    variantsCount: { count: product.variants.length, precision: "EXACT" },
    priceRange: priceRange(product, market, "price"),
    compareAtPriceRange: priceRange(product, market, "compareAtPrice"),
    collections: (args: ConnectionArgs) => connection(productCollections(product), args, (c) => toCollection(c, ctx)),
    metafield: ({ namespace, key }: { namespace: string; key: string }) => productMetafield(product, namespace, key),
    metafields: ({ identifiers }: { identifiers: { namespace: string; key: string }[] }) =>
      identifiers.map((i) => productMetafield(product, i.namespace, i.key)),
    sellingPlanGroups: () => connection([], {}, (x) => x),
  };
}

// ---------------------------------------------------------------------------
// Filtering, sorting and facets
// ---------------------------------------------------------------------------

export type ProductFilterInput = {
  available?: boolean | null;
  price?: { min?: number | null; max?: number | null } | null;
  productType?: string | null;
  productVendor?: string | null;
  tag?: string | null;
  variantOption?: { name: string; value: string } | null;
};

const FILTER_OPTION_NAMES = ["Color", "Finish", "Colorway"];

function productMatchesFilter(product: MockProduct, filter: ProductFilterInput, market: MockMarket) {
  if (filter.available !== undefined && filter.available !== null) {
    return product.variants.some(isAvailable) === filter.available;
  }
  if (filter.price) {
    const min = filter.price.min ?? 0;
    const max = filter.price.max ?? Number.POSITIVE_INFINITY;
    return product.variants.some((v) => {
      const amount = presentmentAmount(v.price, market);
      return amount >= min && amount <= max;
    });
  }
  if (filter.productType) return product.productType === filter.productType;
  if (filter.productVendor) return product.vendor === filter.productVendor;
  if (filter.tag) return product.tags.includes(filter.tag);
  if (filter.variantOption) {
    const { name, value } = filter.variantOption;
    return product.variants.some((v) => Object.entries(v.options).some(([n, val]) => n.toLowerCase() === name.toLowerCase() && val === value));
  }
  return true;
}

const filterKey = (f: ProductFilterInput) =>
  f.available != null ? "available" : f.price ? "price" : f.productType ? "type" : f.productVendor ? "vendor" : f.tag ? "tag" : f.variantOption ? `opt:${f.variantOption.name.toLowerCase()}` : "other";

/** Same-kind filters are OR'ed, different kinds AND'ed (Shopify's behaviour). */
export function applyFilters(products: MockProduct[], filters: ProductFilterInput[] | null | undefined, market: MockMarket) {
  if (!filters?.length) return products;
  const groups = new Map<string, ProductFilterInput[]>();
  for (const f of filters) groups.set(filterKey(f), [...(groups.get(filterKey(f)) ?? []), f]);
  return products.filter((p) => [...groups.values()].every((group) => group.some((f) => productMatchesFilter(p, f, market))));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Builds Storefront API `Filter` objects (facets) for a product set. */
export function buildFilters(products: MockProduct[], market: MockMarket) {
  const count = (pred: (p: MockProduct) => boolean) => products.filter(pred).length;
  const filters: unknown[] = [];

  const inStock = count((p) => p.variants.some(isAvailable));
  filters.push({
    id: "filter.v.availability",
    label: "Availability",
    type: "LIST",
    presentation: "TEXT",
    values: [
      { id: "filter.v.availability.1", label: "In stock", count: inStock, input: JSON.stringify({ available: true }), swatch: null, image: null },
      { id: "filter.v.availability.0", label: "Out of stock", count: products.length - inStock, input: JSON.stringify({ available: false }), swatch: null, image: null },
    ],
  });

  const maxPrice = Math.ceil(Math.max(0, ...products.flatMap((p) => p.variants.map((v) => presentmentAmount(v.price, market)))));
  filters.push({
    id: "filter.v.price",
    label: "Price",
    type: "PRICE_RANGE",
    presentation: null,
    values: [{ id: "filter.v.price", label: "Price", count: 0, input: JSON.stringify({ price: { min: 0, max: maxPrice } }), swatch: null, image: null }],
  });

  const types = [...new Set(products.map((p) => p.productType))].sort();
  if (types.length > 1) {
    filters.push({
      id: "filter.p.product_type",
      label: "Product type",
      type: "LIST",
      presentation: "TEXT",
      values: types.map((t) => ({ id: `filter.p.product_type.${slug(t)}`, label: t, count: count((p) => p.productType === t), input: JSON.stringify({ productType: t }), swatch: null, image: null })),
    });
  }

  for (const optionName of FILTER_OPTION_NAMES) {
    const values = new Map<string, string | undefined>();
    for (const p of products) {
      const option = p.options.find((o) => o.name === optionName);
      option?.values.forEach((v) => values.set(v.name, v.swatch));
    }
    if (values.size < 2) continue;
    filters.push({
      id: `filter.v.option.${slug(optionName)}`,
      label: optionName,
      type: "LIST",
      presentation: "SWATCH",
      values: [...values.entries()].map(([value, swatch]) => ({
        id: `filter.v.option.${slug(optionName)}.${slug(value)}`,
        label: value,
        count: count((p) => p.variants.some((v) => v.options[optionName] === value)),
        input: JSON.stringify({ variantOption: { name: optionName.toLowerCase(), value } }),
        swatch: swatch ? { color: swatch, image: null } : null,
        image: null,
      })),
    });
  }
  return filters;
}

export function sortProducts(products: MockProduct[], sortKey: string | null | undefined, market: MockMarket, query?: string) {
  const list = [...products];
  const minPrice = (p: MockProduct) => Math.min(...p.variants.map((v) => presentmentAmount(v.price, market)));
  switch (sortKey) {
    case "TITLE":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "PRICE":
      return list.sort((a, b) => minPrice(a) - minPrice(b));
    case "BEST_SELLING":
      return list.sort((a, b) => a.salesRank - b.salesRank);
    case "CREATED":
    case "CREATED_AT":
      return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "PRODUCT_TYPE":
      return list.sort((a, b) => a.productType.localeCompare(b.productType));
    case "ID":
      return list.sort((a, b) => a.id.localeCompare(b.id));
    case "RELEVANCE":
      return query ? list.sort((a, b) => scoreProduct(b, query) - scoreProduct(a, query)) : list;
    default:
      return list; // MANUAL / COLLECTION_DEFAULT keep merchandised order
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const tokenize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Simple relevance: title matches weigh most, then type/tags, then options and description. */
export function scoreProduct(product: MockProduct, query: string): number {
  const tokens = tokenize(query);
  if (!tokens.length) return 0;
  const title = product.title.toLowerCase();
  const meta = `${product.productType} ${product.tags.join(" ")} ${product.vendor}`.toLowerCase();
  const options = product.options.flatMap((o) => o.values.map((v) => v.name)).join(" ").toLowerCase();
  const body = stripHtml(product.descriptionHtml + " " + product.summary).toLowerCase();
  let score = 0;
  for (const token of tokens) {
    const stem = token.length > 4 ? token.replace(/(es|s)$/, "") : token;
    let tokenScore = 0;
    if (title.includes(stem)) tokenScore = 10;
    else if (meta.includes(stem)) tokenScore = 6;
    else if (options.includes(stem)) tokenScore = 3;
    else if (body.includes(stem)) tokenScore = 1;
    if (tokenScore === 0) return 0; // every token must match somewhere
    score += tokenScore;
  }
  return score + (title.startsWith(tokens[0]) ? 2 : 0);
}

/** Supports free text plus `tag:`, `product_type:`, `title:` and `available_for_sale:` terms. */
export function queryProducts(query: string | null | undefined, products: MockProduct[] = PRODUCTS) {
  if (!query?.trim()) return products;
  const terms = query.match(/(\w+:"[^"]+"|\w+:\S+|"[^"]+"|\S+)/g) ?? [];
  let list = products;
  const free: string[] = [];
  for (const term of terms) {
    const [field, ...rest] = term.split(":");
    const value = rest.join(":").replace(/^"|"$/g, "");
    if (rest.length === 0) {
      if (!["AND", "OR"].includes(term)) free.push(term.replace(/^"|"$/g, ""));
      continue;
    }
    if (field === "tag") list = list.filter((p) => p.tags.includes(value));
    else if (field === "product_type") list = list.filter((p) => p.productType.toLowerCase() === value.toLowerCase());
    else if (field === "title") list = list.filter((p) => p.title.toLowerCase().includes(value.toLowerCase()));
    else if (field === "available_for_sale") list = list.filter((p) => p.variants.some(isAvailable) === (value === "true"));
    else if (field === "handle") list = list.filter((p) => p.handle === value);
    else free.push(value);
  }
  if (free.length) list = list.filter((p) => scoreProduct(p, free.join(" ")) > 0);
  return list;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function toCollection(collection: MockCollection, ctx: MockRequestContext): Record<string, unknown> {
  const market = findMarket(ctx.country);
  return {
    __typename: "Collection",
    id: gid("Collection", collection.id),
    handle: collection.handle,
    title: collection.title,
    description: () => stripHtml(collection.descriptionHtml),
    descriptionHtml: collection.descriptionHtml,
    image: toImage(collection.image),
    onlineStoreUrl: null,
    trackingParameters: null,
    updatedAt: "2026-11-01T00:00:00Z",
    seo: { title: collection.seo?.title ?? null, description: collection.seo?.description ?? stripHtml(collection.descriptionHtml) },
    metafield: ({ namespace, key }: { namespace: string; key: string }) =>
      namespace === "nova" && key === "kicker"
        ? { id: gid("Metafield", `${collection.id}-kicker`), namespace, key, type: "single_line_text_field", value: collection.kicker, description: null, createdAt: null, updatedAt: null, reference: null, references: null, parentResource: null }
        : null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
    products: (args: ConnectionArgs & { filters?: ProductFilterInput[]; sortKey?: string }) => {
      const base = collectionProducts(collection);
      const filtered = applyFilters(base, args.filters, market);
      const sorted = sortProducts(filtered, args.sortKey, market);
      return connection(sorted, args, (p) => toProduct(p, ctx), { filters: buildFilters(base, market) });
    },
  };
}

export const allCollections = () => COLLECTIONS;
export const allProducts = () => PRODUCTS;
export const productByHandle = (handle: string) => ALL_PRODUCTS.find((p) => p.handle === handle);
