/**
 * Mock Storefront API: an executable copy of Shopify's Storefront API schema,
 * resolved from the NOVA fixtures. Hydrogen's `createStorefrontClient` receives
 * `mockStorefrontFetch` as its `fetch` in DEMO_MODE, so every query and every
 * Hydrogen handler (cart, predictive search, checkout redirect) runs unchanged.
 */
import storefrontSchema from "@shopify/hydrogen/storefront.schema.json";
import {
  ALL_PRODUCTS,
  BLOG,
  COLLECTIONS,
  MARKETS,
  MENUS,
  PAGES,
  POLICIES,
  POPULAR_SEARCHES,
  PRODUCTS,
  SHOP,
  findCollection,
  findMarket,
  findProduct,
  findProductById,
  findVariant,
  type MockArticle,
  type MockMenuItem,
  type MockPage,
} from "~/mocks";
import {
  connection,
  createMockGraphqlFetch,
  gid,
  parseGid,
  runMockGraphql,
  stripHtml,
  type ConnectionArgs,
  type MockGraphqlServerOptions,
  type MockRequestContext,
} from "../graphql.server";
import { createCartRoots } from "./cart.server";
import {
  applyFilters,
  buildFilters,
  isAvailable,
  queryProducts,
  scoreProduct,
  sortProducts,
  toCollection,
  toImage,
  toProduct,
  type ProductFilterInput,
} from "./catalog.server";

const LANGUAGE_NAMES: Record<string, [string, string]> = {
  EN: ["English", "English"],
  FR: ["French", "Français"],
  DE: ["German", "Deutsch"],
  JA: ["Japanese", "日本語"],
};
const CURRENCY_NAMES: Record<string, string> = { USD: "US Dollar", CAD: "Canadian Dollar", GBP: "British Pound", EUR: "Euro", AUD: "Australian Dollar", JPY: "Japanese Yen" };

const language = (code: string) => ({ isoCode: code, name: LANGUAGE_NAMES[code]?.[0] ?? code, endonymName: LANGUAGE_NAMES[code]?.[1] ?? code });

function country(code: string) {
  const market = findMarket(code);
  return {
    isoCode: market.countryCode,
    name: market.name,
    unitSystem: market.countryCode === "US" ? "IMPERIAL_SYSTEM" : "METRIC_SYSTEM",
    currency: { isoCode: market.currencyCode, name: CURRENCY_NAMES[market.currencyCode] ?? market.currencyCode, symbol: market.currencySymbol },
    availableLanguages: market.languages.map(language),
    defaultLanguage: language(market.languages[0]),
    market: { id: gid("Market", market.countryCode), handle: market.countryCode.toLowerCase(), metafield: null, metafields: [] },
  };
}

const trackingParameters = (kind: string, term?: string) =>
  term ? `_pos=1&_psq=${encodeURIComponent(term)}&_ss=e&_v=1.0&_t=${kind}` : null;

function toPage(page: MockPage) {
  return {
    __typename: "Page",
    id: page.id,
    handle: page.handle,
    title: page.title,
    body: page.body,
    bodySummary: page.bodySummary,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    onlineStoreUrl: null,
    trackingParameters: null,
    seo: { title: page.seo?.title ?? null, description: page.seo?.description ?? page.bodySummary },
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  };
}

function toArticle(article: MockArticle, ctx: MockRequestContext): Record<string, unknown> {
  return {
    __typename: "Article",
    id: article.id,
    handle: article.handle,
    title: article.title,
    author: { name: article.author, firstName: article.author.split(" ")[0], lastName: article.author.split(" ")[1] ?? "", bio: null, email: "journal@nova.example" },
    authorV2: { name: article.author, firstName: article.author.split(" ")[0], lastName: article.author.split(" ")[1] ?? "", bio: null, email: "journal@nova.example" },
    publishedAt: article.publishedAt,
    excerpt: () => article.excerpt,
    excerptHtml: `<p>${article.excerpt}</p>`,
    content: () => stripHtml(article.contentHtml),
    contentHtml: article.contentHtml,
    image: toImage(article.image),
    tags: article.tags,
    onlineStoreUrl: null,
    trackingParameters: null,
    seo: { title: null, description: article.excerpt },
    blog: () => toBlog(ctx),
    comments: () => connection([], {}, (x) => x),
    metafield: ({ namespace, key }: { namespace: string; key: string }) =>
      namespace === "nova" && key === "related_products"
        ? { id: gid("Metafield", `${article.id}-rel`), namespace, key, type: "list.single_line_text_field", value: JSON.stringify(article.relatedProductHandles), description: null, createdAt: null, updatedAt: null, reference: null, references: null, parentResource: null }
        : null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  };
}

function toBlog(ctx: MockRequestContext): Record<string, unknown> {
  return {
    __typename: "Blog",
    id: BLOG.id,
    handle: BLOG.handle,
    title: BLOG.title,
    onlineStoreUrl: null,
    seo: { title: null, description: BLOG.description },
    authors: [...new Set(BLOG.articles.map((a) => a.author))].map((name) => ({ name, firstName: name.split(" ")[0], lastName: name.split(" ")[1] ?? "", bio: null, email: "journal@nova.example" })),
    articles: (args: ConnectionArgs) => connection(BLOG.articles, args, (a) => toArticle(a, ctx)),
    articleByHandle: ({ handle }: { handle: string }) => {
      const a = BLOG.articles.find((x) => x.handle === handle);
      return a ? toArticle(a, ctx) : null;
    },
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  };
}

function toMenuItem(item: MockMenuItem, i: number, prefix: string): Record<string, unknown> {
  return {
    id: gid("MenuItem", `${prefix}${i}`),
    title: item.title,
    url: item.url,
    type: item.url.startsWith("/collections") ? "COLLECTION" : item.url.startsWith("/pages") ? "PAGE" : item.url.startsWith("/blogs") ? "BLOG" : "HTTP",
    resourceId: null,
    resource: null,
    tags: [],
    items: (item.items ?? []).map((child, j) => toMenuItem(child, j, `${prefix}${i}-`)),
  };
}

function toPolicy(handle: string) {
  const policy = POLICIES.find((p) => p.handle === handle);
  return policy ? { ...policy, url: `/policies/${policy.handle}` } : null;
}

function predictiveSearch(ctx: MockRequestContext, args: { query: string; limit?: number; types?: string[]; unavailableProducts?: string }) {
  const term = args.query.trim();
  const limit = args.limit ?? 10;
  const types = args.types ?? ["PRODUCT", "COLLECTION", "PAGE", "ARTICLE", "QUERY"];
  const q = term.toLowerCase();
  let products = PRODUCTS.map((p) => ({ p, score: scoreProduct(p, term) || (p.title.toLowerCase().startsWith(q) ? 5 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.salesRank - b.p.salesRank)
    .map((x) => x.p);
  if (args.unavailableProducts === "HIDE") products = products.filter((p) => p.variants.some(isAvailable));
  if (args.unavailableProducts === "LAST") products = [...products.filter((p) => p.variants.some(isAvailable)), ...products.filter((p) => !p.variants.some(isAvailable))];
  const matches = (s: string) => s.toLowerCase().includes(q);
  const suggestionPool = [...POPULAR_SEARCHES, ...new Set(PRODUCTS.flatMap((p) => [p.productType.toLowerCase(), ...p.title.toLowerCase().split(" ")]))];
  const queries = [...new Set(suggestionPool.filter((s) => s.startsWith(q) && s !== q))].slice(0, Math.min(limit, 4));
  return {
    products: types.includes("PRODUCT")
      ? products.slice(0, limit).map((p) => ({ ...toProduct(p, ctx), trackingParameters: trackingParameters("ap", term) }))
      : [],
    collections: types.includes("COLLECTION")
      ? COLLECTIONS.filter((c) => matches(c.title) || matches(c.handle)).slice(0, limit).map((c) => ({ ...toCollection(c, ctx), trackingParameters: trackingParameters("ac", term) }))
      : [],
    pages: types.includes("PAGE") ? PAGES.filter((p) => matches(p.title)).slice(0, limit).map((p) => ({ ...toPage(p), trackingParameters: trackingParameters("ap", term) })) : [],
    articles: types.includes("ARTICLE")
      ? BLOG.articles.filter((a) => matches(a.title) || a.tags.some(matches)).slice(0, limit).map((a) => ({ ...toArticle(a, ctx), trackingParameters: trackingParameters("aa", term) }))
      : [],
    queries: types.includes("QUERY")
      ? queries.map((text) => ({
          __typename: "SearchQuerySuggestion",
          text,
          styledText: text.replace(q, `<mark>${q}</mark>`),
          trackingParameters: `_pos=1&_psq=${encodeURIComponent(term)}&_ss=e&_v=1.0&_t=as`,
        }))
      : [],
  };
}

export function createStorefrontRoots(ctx: MockRequestContext) {
  const cart = createCartRoots(ctx);
  const market = findMarket(ctx.country);
  const nodeById = (id: string) => {
    const raw = parseGid(id);
    if (id.includes("/Product/")) {
      const p = findProductById(raw);
      return p ? toProduct(p, ctx) : null;
    }
    if (id.includes("/ProductVariant/")) {
      const found = findVariant(raw);
      return found ? (toProduct(found.product, ctx).variants as (a: ConnectionArgs) => { nodes: { id: string }[] })({}).nodes.find((v) => v.id === id) ?? null : null;
    }
    if (id.includes("/Collection/")) {
      const c = COLLECTIONS.find((x) => x.id === raw);
      return c ? toCollection(c, ctx) : null;
    }
    return null;
  };

  return {
    query: {
      ...cart.query,
      shop: {
        id: SHOP.id,
        name: SHOP.name,
        description: SHOP.description,
        moneyFormat: "${{amount}}",
        primaryDomain: { host: new URL(SHOP.primaryDomain).host, url: SHOP.primaryDomain, sslEnabled: true },
        brand: {
          slogan: SHOP.brand.slogan,
          shortDescription: SHOP.brand.shortDescription,
          colors: {
            primary: [{ background: SHOP.brand.colors.primary, foreground: SHOP.brand.colors.secondary }],
            secondary: [{ background: SHOP.brand.colors.secondary, foreground: SHOP.brand.colors.primary }],
          },
          logo: null,
          squareLogo: null,
          coverImage: null,
        },
        paymentSettings: {
          currencyCode: market.currencyCode,
          countryCode: SHOP.countryCode,
          acceptedCardBrands: SHOP.acceptedCardBrands,
          supportedDigitalWallets: SHOP.supportedDigitalWallets,
          enabledPresentmentCurrencies: [...new Set(MARKETS.map((m) => m.currencyCode))],
          cardVaultUrl: "https://elb.deposit.shopifycs.com/sessions",
          shopifyPaymentsAccountId: null,
        },
        shipsToCountries: MARKETS.map((m) => m.countryCode),
        privacyPolicy: toPolicy("privacy-policy"),
        refundPolicy: toPolicy("refund-policy"),
        shippingPolicy: toPolicy("shipping-policy"),
        termsOfService: toPolicy("terms-of-service"),
        subscriptionPolicy: null,
        termsOfSale: null,
        legalNotice: null,
        contactInformation: null,
        customerAccountUrl: null,
        metafield: () => null,
        metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
      },
      localization: {
        country: country(ctx.country),
        language: language(ctx.language),
        availableCountries: MARKETS.map((m) => country(m.countryCode)),
        availableLanguages: [...new Set(MARKETS.flatMap((m) => m.languages))].map(language),
        market: country(ctx.country).market,
      },
      product: ({ handle, id }: { handle?: string; id?: string }) => {
        const p = handle ? findProduct(handle) : id ? findProductById(parseGid(id)) : undefined;
        return p ? toProduct(p, ctx) : null;
      },
      productByHandle: ({ handle }: { handle: string }) => {
        const p = findProduct(handle);
        return p ? toProduct(p, ctx) : null;
      },
      products: (args: ConnectionArgs & { query?: string; sortKey?: string }) =>
        connection(sortProducts(queryProducts(args.query, ALL_PRODUCTS.filter((p) => !p.isGiftCard || args.query?.includes("gift"))), args.sortKey, market, args.query), args, (p) => toProduct(p, ctx), { filters: [] }),
      productRecommendations: ({ productHandle, productId, intent }: { productHandle?: string; productId?: string; intent?: string }) => {
        const p = productHandle ? findProduct(productHandle) : productId ? findProductById(parseGid(productId)) : undefined;
        if (!p) return null;
        const handles = intent === "COMPLEMENTARY" ? p.complementary : p.related;
        return handles.map((h) => findProduct(h)).filter((x) => x !== undefined).map((x) => toProduct(x, ctx));
      },
      productTypes: ({ first }: { first: number }) => connection([...new Set(PRODUCTS.map((p) => p.productType))].sort(), { first }, (x) => x),
      productTags: ({ first }: { first: number }) => connection([...new Set(PRODUCTS.flatMap((p) => p.tags))].sort(), { first }, (x) => x),
      collection: ({ handle, id }: { handle?: string; id?: string }) => {
        const c = handle ? findCollection(handle) : COLLECTIONS.find((x) => id && x.id === parseGid(id));
        return c ? toCollection(c, ctx) : null;
      },
      collectionByHandle: ({ handle }: { handle: string }) => {
        const c = findCollection(handle);
        return c ? toCollection(c, ctx) : null;
      },
      collections: (args: ConnectionArgs & { query?: string }) =>
        connection(COLLECTIONS.filter((c) => !args.query || c.title.toLowerCase().includes(args.query.toLowerCase().replace(/^title:/, ""))), args, (c) => toCollection(c, ctx)),
      search: (args: ConnectionArgs & { query: string; productFilters?: ProductFilterInput[]; sortKey?: string; types?: string[]; unavailableProducts?: string }) => {
        const base = queryProducts(args.query, PRODUCTS);
        let products = sortProducts(applyFilters(base, args.productFilters, market), args.sortKey ?? "RELEVANCE", market, args.query);
        if (args.unavailableProducts === "HIDE") products = products.filter((p) => p.variants.some(isAvailable));
        if (args.unavailableProducts === "LAST") products = [...products.filter((p) => p.variants.some(isAvailable)), ...products.filter((p) => !p.variants.some(isAvailable))];
        const includeProducts = !args.types || args.types.includes("PRODUCT");
        const extra: Record<string, unknown>[] = [];
        if (args.types?.includes("PAGE")) extra.push(...PAGES.filter((p) => stripHtml(p.body + p.title).toLowerCase().includes(args.query.toLowerCase())).map(toPage));
        if (args.types?.includes("ARTICLE")) extra.push(...BLOG.articles.filter((a) => (a.title + a.excerpt).toLowerCase().includes(args.query.toLowerCase())).map((a) => toArticle(a, ctx)));
        const items: Record<string, unknown>[] = [
          ...(includeProducts ? products.map((p) => ({ ...toProduct(p, ctx), trackingParameters: trackingParameters("s", args.query) })) : []),
          ...extra,
        ];
        return connection(items, args, (x) => x, { productFilters: buildFilters(base, market) });
      },
      predictiveSearch: (args: { query: string; limit?: number; types?: string[]; unavailableProducts?: string }) => predictiveSearch(ctx, args),
      page: ({ handle, id }: { handle?: string; id?: string }) => {
        const p = PAGES.find((x) => x.handle === handle || x.id === id);
        return p ? toPage(p) : null;
      },
      pageByHandle: ({ handle }: { handle: string }) => {
        const p = PAGES.find((x) => x.handle === handle);
        return p ? toPage(p) : null;
      },
      pages: (args: ConnectionArgs) => connection(PAGES, args, toPage),
      blog: ({ handle, id }: { handle?: string; id?: string }) => (handle === BLOG.handle || id === BLOG.id ? toBlog(ctx) : null),
      blogByHandle: ({ handle }: { handle: string }) => (handle === BLOG.handle ? toBlog(ctx) : null),
      blogs: (args: ConnectionArgs) => connection([BLOG], args, () => toBlog(ctx)),
      article: ({ id }: { id: string }) => {
        const a = BLOG.articles.find((x) => x.id === id);
        return a ? toArticle(a, ctx) : null;
      },
      articles: (args: ConnectionArgs & { sortKey?: string }) =>
        connection(args.sortKey === "PUBLISHED_AT" ? [...BLOG.articles].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)) : BLOG.articles, args, (a) => toArticle(a, ctx)),
      menu: ({ handle }: { handle: string }) => {
        const items = MENUS[handle as keyof typeof MENUS];
        if (!items) return null;
        return { id: gid("Menu", handle), handle, title: handle, itemsCount: items.length, items: items.map((item, i) => toMenuItem(item, i, handle)) };
      },
      node: ({ id }: { id: string }) => nodeById(id),
      nodes: ({ ids }: { ids: string[] }) => ids.map(nodeById),
      paymentSettings: () => null,
      publicApiVersions: [{ handle: "2026-10", displayName: "2026-10 (Latest)", supported: true }],
      urlRedirects: (args: ConnectionArgs) => connection([], args, (x) => x),
      sitemap: () => null,
      customer: () => null,
      metaobject: () => null,
      metaobjects: (args: ConnectionArgs) => connection([], args, (x) => x),
      locations: (args: ConnectionArgs) => connection([], args, (x) => x),
      cartCompletionAttempt: () => null,
    },
    mutation: cart.mutation,
  };
}

const latency = () => ({
  query: Number(process.env.MOCK_API_QUERY_LATENCY_MS ?? 25),
  mutation: Number(process.env.MOCK_API_MUTATION_LATENCY_MS ?? 350),
});

/**
 * Builds the mock server for one request. `origin` is the storefront origin
 * (checkout URLs point back to the local demo checkout page).
 */
export function mockStorefrontServer(origin: string): MockGraphqlServerOptions {
  return {
    name: "storefront",
    introspection: storefrontSchema,
    createRoots: createStorefrontRoots,
    latency: latency(),
    getOrigin: () => origin,
  };
}

/** `fetch` replacement passed to `createStorefrontClient` in DEMO_MODE. */
export const createMockStorefrontFetch = (origin: string) => createMockGraphqlFetch(mockStorefrontServer(origin));

/** Answers the SFAPI proxy route (`/api/{version}/graphql.json`) in DEMO_MODE. */
export async function handleMockStorefrontProxy(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.method !== "POST") return Response.json({ errors: [{ message: "Use POST" }] }, { status: 405 });
  const body = (await request.json().catch(() => ({}))) as Parameters<typeof runMockGraphql>[1];
  const result = await runMockGraphql(mockStorefrontServer(origin), body);
  return Response.json(result, { headers: { "x-nova-mock-api": "storefront", "cache-control": "no-store" } });
}
