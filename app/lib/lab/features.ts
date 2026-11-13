/**
 * Hydrogen Lab content registry. Each feature is documented with its real
 * Hydrogen 2026.10 API, data source and an honest implementation status.
 */
export type Status = "real" | "mock" | "creds" | "custom" | "na";

export const STATUS_META: Record<Status, { label: string; className: string; description: string }> = {
  real: { label: "Real Hydrogen", className: "status-real", description: "Runs Hydrogen's own code path, unchanged." },
  mock: { label: "Mock adapter", className: "status-mock", description: "Real Hydrogen code, with data from the local mock API." },
  creds: { label: "Needs a store", className: "status-creds", description: "Requires real Shopify credentials to work end to end." },
  custom: { label: "Custom feature", className: "status-custom", description: "Built by this app, not a Hydrogen primitive." },
  na: { label: "Not in 2026.10", className: "status-na", description: "Not shipped by the installed Hydrogen version." },
};

export type Feature = {
  id: string;
  title: string;
  summary: string;
  api: string[];
  status: Status[];
  data: string;
  docs: string;
  code?: string;
  where?: { label: string; to: string }[];
  demo?: string;
};

export type Section = { slug: string; letter: string; title: string; intro: string; features: Feature[] };

const DOCS = "https://shopify.dev/docs/api/hydrogen/latest";
const SKILL = (name: string) => `.claude/skills/${name}/SKILL.md`;

export const SECTIONS: Section[] = [
  {
    slug: "storefront-api",
    letter: "A",
    title: "Storefront API",
    intro: "Hydrogen 2026.10 ships a type-safe Storefront API client. `gql()` infers result and variable types from the query string itself, with no codegen step. Every query in this app goes through it, and in demo mode the client's injected `fetch` executes them against Hydrogen's own packaged schema.",
    features: [
      {
        id: "graphql-explorer",
        title: "GraphQL queries & typed responses",
        summary: "Write a query, run it through the same-origin SFAPI proxy, inspect the JSON. Invalid fields fail schema validation exactly like on Shopify.",
        api: ["createStorefrontClient", "gql", "StorefrontApi.ResultOf", "client.graphql"],
        status: ["real", "mock"],
        data: "Demo: mock SFAPI (graphql-js over storefront.schema.json). Live: your store.",
        docs: DOCS,
        demo: "graphql-explorer",
        where: [{ label: "All loaders", to: "/" }],
        code: `import { gql, type StorefrontApi } from "@shopify/hydrogen";

const PRODUCT = gql(\`
  query Product($handle: String!, $country: CountryCode)
  @inContext(country: $country) {
    product(handle: $handle) { title priceRange { minVariantPrice { amount currencyCode } } }
  }
\`);
type Result = StorefrontApi.ResultOf<typeof PRODUCT>; // inferred, no codegen

// $country is filled from requestContext.locale automatically
const { data, errors } = await storefront.graphql(PRODUCT, { variables: { handle } });`,
      },
      {
        id: "errors",
        title: "API error handling",
        summary: "Transport failures throw StorefrontApiError / StorefrontTimeoutError; GraphQL errors are returned alongside partial data. Loaders log errors and return 500, and return 404 only when there are no errors and the resource is missing.",
        api: ["StorefrontApiError", "StorefrontTimeoutError", "result.errors"],
        status: ["real"],
        data: "Any",
        docs: DOCS,
        where: [{ label: "Missing product (404)", to: "/products/does-not-exist" }],
        code: `const { data, errors } = await storefront.graphql(PRODUCT_QUERY, { variables });
if (errors) {
  console.error("[nova] product query failed", errors);
  throw new Response("Product query failed", { status: 500 });
}
if (!data?.product) throw new Response("Not found", { status: 404 });`,
      },
      {
        id: "store-config",
        title: "Store configuration",
        summary: "Shop name, payment settings, policies, localization and brand come from `shop` and `localization` queries in the root loader.",
        api: ["shop", "localization"],
        status: ["real", "mock"],
        data: "Mock store config (app/mocks/store.ts) or your store",
        docs: "https://shopify.dev/docs/api/storefront/latest/objects/Shop",
      },
    ],
  },
  {
    slug: "request-handlers",
    letter: "B",
    title: "Request handlers",
    intro: "`handleShopifyRoutes()` runs in the root middleware before React Router and owns Shopify's endpoints. `handleShopifyRedirects()` runs only after the router returns a 404. Probe each endpoint below: requests are made from the server so you can see real status codes, redirects and headers.",
    features: [
      {
        id: "probe",
        title: "Shopify route handling",
        summary: "Cart API, predictive search, checkout redirect, cart permalinks, the SFAPI proxy, ?variant= redirects, /admin, robots and UCP discovery.",
        api: ["handleShopifyRoutes", "handleShopifyRedirects", "createCartServerHandlers", "createPredictiveSearchServerHandlers", "defineShopifyRouteTemplates"],
        status: ["real", "mock"],
        data: "Hydrogen handlers + mock SFAPI",
        docs: SKILL("hydrogen-request-handlers"),
        demo: "request-probe",
        code: `export const shopifyMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const requestContext = createShopifyRequestContext({ request, i18n });
  const storefront = createStorefrontClient({ type: "public", requestContext, config });
  const shopifyRoute = handleShopifyRoutes({
    request, requestContext, storefrontClient: storefront, sessionManager,
    routeTemplates, handlers: [cartHandlers, predictiveSearchHandlers],
  });
  if (shopifyRoute) return shopifyRoute;          // never awaited before the null check
  context.set(shopifyContext, { storefront, requestContext /* … */ });
  const response = await next();
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient: storefront, routeTemplates });
    if (redirect) return redirect;
  }
  requestContext.applyResponseHeaders(response.headers);
  return response;
};`,
      },
      {
        id: "checkout",
        title: "Checkout handling",
        summary: "`/checkout` loads the cart from the cart cookie and redirects to `cart.checkoutUrl`. In demo mode that URL is the local checkout demonstration.",
        api: ["handleShopifyRoutes (/checkout)"],
        status: ["real", "mock", "creds"],
        data: "Mock cart checkoutUrl / real Shopify Checkout",
        docs: SKILL("hydrogen-request-handlers"),
        where: [{ label: "Demo checkout page", to: "/demo-checkout" }],
      },
      {
        id: "url-redirects",
        title: "URL redirects & /admin",
        summary: "After a 404, Hydrogen checks Shopify URL redirects, standard-route redirects and /admin. Storefront URL redirects need a real store.",
        api: ["handleShopifyRedirects"],
        status: ["real", "creds"],
        data: "Your store's URL redirects",
        docs: SKILL("hydrogen-request-handlers"),
      },
    ],
  },
  {
    slug: "product-collection",
    letter: "C",
    title: "Product & collection primitives",
    intro: "The product form store decodes `encodedVariantExistence` / `encodedVariantAvailability` to compute which option values exist and are in stock, with no network requests. Collection browsing keeps filters and sort in the URL. Below, the live store state for Keyframe 75 (Midnight/Tactile does not exist; Sand/Tactile is sold out).",
    features: [
      {
        id: "variant-store",
        title: "Variant selection & product forms",
        summary: "Select options and watch exists / available / selected update symmetrically. The same `useProductForm` binding powers the PDP and quick view.",
        api: ["createProductComponents", "useProductForm", "canAddToCart", "getSelectedProductOptions", "buildProductSelectionSearchParams"],
        status: ["real", "mock"],
        data: "Mock catalog (v1-encoded variant matrix)",
        docs: SKILL("hydrogen-variant-form"),
        demo: "variant-store",
        where: [
          { label: "PDP with unavailable combos", to: "/products/keyframe-75-keyboard" },
          { label: "Variant images", to: "/products/halo-anc-headphones" },
        ],
        code: `export const { ProductProvider, useProductForm } = createProductComponents<ProductData>();

<ProductProvider product={product} onSelect={(r) => navigate(variantUrl(product, r.selectedOptions, …), { replace: true, preventScrollReset: true })}>
  const { options, selectedVariant, formProps, register } = useProductForm();
  <form {...formProps({ beforeSubmit: openCartDrawer })}>
    <input type="hidden" {...register("merchandiseId", {})} />
    <button {...register("addToCart", {})} disabled={!canAddToCart(product, options)} />
  </form>`,
      },
      {
        id: "collection-browse",
        title: "Collection filtering, sorting & pagination",
        summary: "Filters from Storefront API `Filter.values[].input`, Liquid-compatible params, active chips, price range, a no-JS GET form and load more.",
        api: ["CollectionProvider", "useCollection", "useCollectionForm", "parseCollectionParams", "serializeCollectionParams", "getFilterRemovalUrl", "getSortByValue", "isFilterInputActive"],
        status: ["real", "mock"],
        data: "Mock filters (availability, price, type, colour swatches)",
        docs: SKILL("hydrogen-collection-browser"),
        demo: "browse-params",
        where: [
          { label: "Desk, filtered", to: "/collections/desk?filter.v.availability=1&sort_by=price-ascending" },
          { label: "Sound", to: "/collections/sound" },
        ],
      },
    ],
  },
  {
    slug: "cart-store",
    letter: "D",
    title: "Cart",
    intro: "The cart is a client store synchronised through Shopify Standard Actions. Mutations apply an optimistic projection immediately, track pending entities, and reconcile when the server answers. Inspect the live store and drive it below; the drawer and /cart use the same contract.",
    features: [
      {
        id: "cart-store",
        title: "Cart store, mutations & optimistic updates",
        summary: "Live view of `useCart()` state: lines, pending sets, errors, revalidating. Buttons call `window.Shopify.actions.updateCart()`, the same path code-driven changes use.",
        api: ["createCartComponents", "useCart", "useCartForm", "useCartActions().refresh", "window.Shopify.actions.updateCart", "window.Shopify.actions.openCart"],
        status: ["real", "mock"],
        data: "Mock cart engine (server-side, in memory)",
        docs: SKILL("hydrogen-cart-ui"),
        demo: "cart-inspector",
        code: `export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();

// root loader: non-blocking bootstrap, envelope not unwrapped
const cart = cartHandlers.get({ storefrontClient }).then(({ data }) => data);
<CartProvider initialData={loaderData.cart}>…</CartProvider>

// line form contract
<form {...formProps()}>
  <button {...register("set")} />
  <input type="hidden" {...register("lineId", { value: line.id })} />
  <input {...register("quantity", { value: line.quantity, interactive: true })} />
  <button {...register("increase")} /> <button {...register("remove")} />
</form>`,
      },
      {
        id: "progressive",
        title: "Server-driven cart & progressive enhancement",
        summary: "Without JavaScript, every cart form posts natively to /api/cart, which sets the cart cookie. /cart server-renders the resolved cart.",
        api: ["createCartServerHandlers", "createCartCookie", "getCartId"],
        status: ["real"],
        data: "Any",
        docs: SKILL("hydrogen-cart-ui"),
        where: [{ label: "Full cart page", to: "/cart" }],
      },
      {
        id: "drawer",
        title: "Cart drawer",
        summary: "Native <dialog> with showModal(), closedby=\"any\", @starting-style animation and CSS scroll lock, wired to Standard Actions `openCart`.",
        api: ["window.Shopify.actions.openCart.configure"],
        status: ["real"],
        data: "Any",
        docs: SKILL("hydrogen-cart-drawer"),
      },
      {
        id: "gift-cards",
        title: "Discounts, gift cards & out-of-band mutations",
        summary: "Discount codes use the cart form contract. Gift cards (`cartGiftCardCodesUpdate`) aren't wrapped by the handlers: the /cart action runs the mutation, then calls `refresh()`.",
        api: ["register('discount-apply')", "useCartActions().refresh"],
        status: ["real", "mock"],
        data: "Mock discount & gift card rules",
        docs: SKILL("hydrogen-cart-ui"),
        where: [{ label: "Try codes on /cart", to: "/cart" }],
      },
    ],
  },
  {
    slug: "predictive-search",
    letter: "E",
    title: "Search",
    intro: "Predictive search runs through Hydrogen's store (debounce, aborts, stale-response handling) against the same-origin `/api/predictive-search` handler. Full search reuses the collection browser with `q` preserved.",
    features: [
      {
        id: "predictive",
        title: "Predictive search, search store & autocomplete",
        summary: "Type below to see raw store state and tracking-preserving result URLs from `getPredictiveSearchItemUrl()`.",
        api: ["PredictiveSearchProvider", "usePredictiveSearch", "usePredictiveSearchForm", "getPredictiveSearchItemUrl", "makePredictiveSearchQueries"],
        status: ["real", "mock"],
        data: "Mock predictive search resolver",
        docs: SKILL("hydrogen-predictive-search"),
        demo: "predictive-search",
        where: [
          { label: "Full search", to: "/search?q=walnut" },
          { label: "No results", to: "/search?q=zzz" },
        ],
      },
    ],
  },
  {
    slug: "customer-accounts",
    letter: "F",
    title: "Customer accounts",
    intro: "Live mode registers Hydrogen's OAuth handlers (/account/login, /authorize, /refresh, /logout). Demo mode swaps OAuth for a profile picker and serves the same typed Customer Account API queries from a mock CAAPI.",
    features: [
      {
        id: "session",
        title: "Authentication, sessions, login & logout",
        summary: "Signed HttpOnly session cookie; `isLoggedIn()` for read-only UI, `getAccessToken()` before CAAPI calls, and a one-shot refresh redirect. Tokens never reach loader data.",
        api: ["createCustomerSession", "createCustomerAccountServerHandlers", "WritableCustomerSessionManager"],
        status: ["real", "mock", "creds"],
        data: "Demo session / Shopify OAuth (requires HTTPS + client id)",
        docs: SKILL("hydrogen-customer-account"),
        demo: "account-status",
        where: [{ label: "Account", to: "/account" }],
      },
      {
        id: "caapi",
        title: "Customer profile & order history",
        summary: "Profile edit, addresses CRUD, order list, order detail with fulfillment timelines and tracking.",
        api: ["createCustomerAccountClient", "gql (customer-account)"],
        status: ["real", "mock"],
        data: "Mock CAAPI over customer-account.schema.json",
        docs: "https://shopify.dev/docs/api/customer",
        where: [{ label: "Orders", to: "/account/orders" }],
        code: `import { createCustomerAccountClient, gql } from "@shopify/hydrogen/customer-account";
const client = createCustomerAccountClient({ shopId, requestContext /* demo: fetch: mockCaapi */ });
const { data } = await client.graphql(CUSTOMER_QUERY, { accessToken });`,
      },
    ],
  },
  {
    slug: "markets",
    letter: "G",
    title: "Shopify Markets",
    intro: "`defineShopifyI18n` declares pathname markets (/en-ca, /en-gb, /fr-fr, /en-au, /ja-jp). The request context resolves the locale from the URL and fills `@inContext(country, language)` in every query. Prices below are fetched server-side per market.",
    features: [
      {
        id: "localized-pricing",
        title: "Country selector, localized pricing & currency formatting",
        summary: "Same product, six markets, with presentment prices from the API (mock: Shopify-style rounding) formatted by `formatMoney` in each locale.",
        api: ["defineShopifyI18n", "createShopifyRequestContext", "getLocalizedHref", "getSupportedLocales", "formatMoney"],
        status: ["real", "mock"],
        data: "Mock market rates & rounding",
        docs: SKILL("hydrogen-markets"),
        demo: "markets",
      },
      {
        id: "format-money",
        title: "Money formatting",
        summary: "Try amounts, currencies and locales through Hydrogen's `formatMoney()` structured output.",
        api: ["formatMoney"],
        status: ["real"],
        data: "None",
        docs: SKILL("hydrogen-money"),
        demo: "format-money",
      },
    ],
  },
  {
    slug: "analytics",
    letter: "H",
    title: "Analytics & consent",
    intro: "`ShopifyScripts` creates the analytics bus at `window.Shopify.analytics`. Routes publish view events and `useCartAnalytics()` publishes cart deltas. A custom consent banner syncs choices to Customer Privacy. Destinations receive nothing until consent allows it, and buffered events then replay.",
    features: [
      {
        id: "event-log",
        title: "Page, product, cart & checkout events",
        summary: "Live log from a destination registered with `addDestination()`. Navigate the store in another tab or use the buttons, then watch events arrive.",
        api: ["ShopifyScripts", "AnalyticsEvent", "useCartAnalytics", "StorefrontAnalytics.addDestination"],
        status: ["real"],
        data: "Real bus (Shopify delivery disabled in demo)",
        docs: SKILL("hydrogen-analytics"),
        demo: "analytics",
      },
      {
        id: "consent",
        title: "Customer privacy consent & consent-gated analytics",
        summary: "consent: { mode: 'custom-banner', setup }. Demo mode simulates Shopify's consentManagement endpoint so the Customer Privacy API works without a store.",
        api: ["ConsentConfig", "window.Shopify.customerPrivacy.setTrackingConsent"],
        status: ["real", "mock"],
        data: "Simulated consent backend in demo",
        docs: ".claude/skills/hydrogen-analytics/references/custom-consent.md",
      },
    ],
  },
  {
    slug: "shop-pay",
    letter: "I",
    title: "Shop Pay",
    intro: "Hydrogen renders the Shop Pay button locally as a `<hydrogen-shop-pay-button>` with a declarative shadow root. It links to same-origin `/checkout` or `/cart/{id}:{qty}`, which `handleShopifyRoutes` redirects to checkout. No external script loads.",
    features: [
      {
        id: "shop-pay-button",
        title: "Shop Pay button integration",
        summary: "Product mode (variant + quantity) and cart mode. Inspect the generated link. Completing a Shop Pay payment needs a real store with Shop Pay enabled.",
        api: ["ShopPayButton", "createShopPayButton", "renderShopPayButton"],
        status: ["real", "creds"],
        data: "Mock variant ids; real Shop Pay requires a store",
        docs: SKILL("hydrogen-shop-pay"),
        demo: "shop-pay",
      },
    ],
  },
  {
    slug: "performance",
    letter: "J",
    title: "Performance",
    intro: "Server rendering by default, streaming for below-the-fold data, CDN image transforms, and Hydrogen's sub-request cache for runtimes with a cache store (Oxygen, workers).",
    features: [
      {
        id: "caching",
        title: "Storefront API caching & cache strategies",
        summary: "`Cache.long()/short()/none()` opt in per query. Caching only engages when the client is given a `cache` (Oxygen/worker). Node dev has none, so this app doesn't pass one.",
        api: ["Cache", "createRunWithCache", "createFetchWithCache", "CachingStrategy"],
        status: ["real", "creds"],
        data: "Requires a CacheStorage runtime",
        docs: ".claude/skills/hydrogen-storefront-client/references/caching.md",
        demo: "cache-strategies",
        code: `const client = createStorefrontClient({ type: "public", requestContext,
  config: { storeDomain, publicStorefrontToken, cache: await caches.open("hydrogen"), waitUntil } });
await client.graphql(PRODUCTS, { variables, cache: Cache.long() }); // never for cart/customer`,
      },
      {
        id: "streaming",
        title: "Server rendering, streaming & loading states",
        summary: "Loaders return promises for slow, non-critical data; `<Await>` + `<Suspense>` stream them in. The PDP streams recommendations and reviews this way.",
        api: ["React Router <Await>", "Suspense"],
        status: ["real"],
        data: "Any",
        docs: "https://reactrouter.com/how-to/suspense",
        demo: "streaming",
      },
      {
        id: "images",
        title: "Image optimization",
        summary: "Hydrogen ships no Image component. A tiny helper adds `?width=&height=&crop=` to Shopify CDN URLs and builds `srcset`.",
        api: ["shopifyImageUrl (app helper)"],
        status: ["real", "custom"],
        data: "Shopify CDN",
        docs: SKILL("hydrogen-image"),
        demo: "images",
      },
    ],
  },
  {
    slug: "seo",
    letter: "K",
    title: "SEO",
    intro: "SEO is app-owned in Hydrogen 2026.10: route `meta` exports, canonical links, JSON-LD built from Storefront API data, plus /sitemap.xml and /robots.txt.",
    features: [
      {
        id: "meta",
        title: "Meta, canonical URLs & structured data",
        summary: "Server-rendered tags fetched from real routes: title, description, canonical, and JSON-LD (Organization, Product, BreadcrumbList, Article, CollectionPage).",
        api: ["React Router meta", "script:ld+json"],
        status: ["custom", "real"],
        data: "Storefront API data",
        docs: "https://reactrouter.com/start/framework/route-module#meta",
        demo: "seo",
      },
      {
        id: "robots",
        title: "Sitemap & robots",
        summary: "robots.txt follows the hydrogen-robots-txt rules (cart, account, checkout, API, sort/filter duplicates), repeated for each market prefix.",
        api: ["Resource routes"],
        status: ["custom"],
        data: "Storefront API",
        docs: SKILL("hydrogen-robots-txt"),
        where: [
          { label: "/robots.txt", to: "/robots.txt" },
          { label: "/sitemap.xml", to: "/sitemap.xml" },
        ],
      },
    ],
  },
  {
    slug: "oxygen",
    letter: "L",
    title: "Oxygen",
    intro: "Oxygen is a Web Worker runtime. This app runs on Node by default but keeps the server code worker-friendly: Web Request/Response, no Node-only APIs in request paths, env read in one module, and per-request Shopify objects.",
    features: [
      {
        id: "runtime",
        title: "Deployment compatibility & runtime requirements",
        summary: "Checklist of what the codebase already satisfies and what a deploy adds (worker entry, MiniOxygen, cache, waitUntil).",
        api: ["@shopify/hydrogen/vite", "skill: hydrogen-oxygen"],
        status: ["creds"],
        data: "Requires Shopify Oxygen deployment",
        docs: SKILL("hydrogen-oxygen"),
        demo: "oxygen",
      },
    ],
  },
  {
    slug: "agentic",
    letter: "M",
    title: "Agentic commerce",
    intro: "With a real store, `handleShopifyRoutes` proxies `/api/mcp` to Shopify's Storefront MCP server and serves `/.well-known/ucp`; `initializeShopifyScripts` loads WebMCP tools in supporting browsers. Demo mode answers `/api/mcp` locally with the same tool names, backed by the mock catalog and carts.",
    features: [
      {
        id: "mcp",
        title: "MCP endpoint, product discovery & cart interaction",
        summary: "Send JSON-RPC to /api/mcp: list tools, search the catalog, fetch product details, create a cart.",
        api: ["handleShopifyRoutes (/api/mcp, /.well-known/ucp)", "initializeShopifyScripts({ webMcp })"],
        status: ["mock", "creds"],
        data: "Simulated MCP server in demo; Shopify Storefront MCP live",
        docs: "https://shopify.dev/docs/apps/build/storefront-mcp",
        demo: "mcp-console",
      },
      {
        id: "agent-flow",
        title: "Agent-assisted shopping flow",
        summary: "A deterministic demo agent (rules, not an LLM) turns a request into MCP tool calls: search → details → cart → checkout link. Plug an LLM in by giving it the same tools.",
        api: ["MCP tools/call"],
        status: ["custom", "mock"],
        data: "Mock catalog via MCP",
        docs: "https://shopify.dev/docs/apps/build/storefront-mcp",
        demo: "agent",
      },
    ],
  },
];

export const findSection = (slug: string) => SECTIONS.find((s) => s.slug === slug);
