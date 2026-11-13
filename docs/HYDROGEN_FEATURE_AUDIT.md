# Hydrogen Feature Audit

Discovery notes for the NOVA demo storefront. Everything below was verified against
the **installed** package (`node_modules/@shopify/hydrogen`, its `.d.mts` types and the
version-matched agent skills in `.claude/skills`), not against older tutorials.

## 1. Installed stack

| Item | Version / finding |
| --- | --- |
| `@shopify/hydrogen` | **2026.10.3**: the framework-agnostic *library* release. Hydrogen is no longer a framework that owns the request; it is a set of server handlers, client stores and helpers you compose. |
| Framework | React Router **8.5.1** framework mode (`react-router.config.ts`, `ssr: true`), Vite 8 |
| React | 19.2 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Runtime | Node 24 (`@react-router/serve`) locally; Oxygen-compatible worker documented separately |
| Storefront API version | `2026-10` (Hydrogen default) |
| Agent skills | 21 version-matched skills synced to `.claude/skills` and `.agents/skills` (`hydrogen-*`, `migrate-to-hydrogen-2026-10`). The `dev` script runs `hydrogen skills check --mode=warn`. |
| GraphQL validation | `hydrogen gql check --fail-on-warn` (packaged SFAPI + Customer Account schemas) chained into `typecheck`; TS plugin `@shopify/hydrogen/ts-plugin` in `tsconfig.json` |

Package entry points: `@shopify/hydrogen` (core), `/react`, `/vue`, `/customer-account`,
`/storefront-api-types`, `/customer-account-api-types`, `/vite`, `/ts-plugin`, and the two
schema JSON files.

## 2. Deprecated / removed APIs (do not use)

Tutorials written for Hydrogen 2023–2025 (Remix-era) reference APIs that **do not exist** in
2026.10. We avoid all of them:

| Old API | 2026.10 replacement |
| --- | --- |
| `createHydrogenContext`, `createStorefrontClient` from `@shopify/hydrogen` with `storefront.query()` | `createStorefrontClient({type, requestContext, config})` + `client.graphql(gql(...))` |
| `CartForm`, `cart.addLines()` handler object | `createCartServerHandlers()` + `createCartComponents()` (`useCartForm`, Standard Actions events) |
| `<Image>`, `<Money>`, `<Analytics.Provider>` components | Plain `<img>` + CDN URL helper; `formatMoney()`; `ShopifyScripts` + `window.Shopify.analytics` bus |
| `VariantSelector`, `getAdjacentAndFirstAvailableVariants` | `createProductComponents()` / `createProductFormStore()` with `encodedVariantExistence` |
| `Pagination`, `getPaginationVariables` | Collection store + GET links with `after` cursors |
| `createCustomerAccountClient` on the Hydrogen context | `@shopify/hydrogen/customer-account` (`createCustomerSession`, `createCustomerAccountServerHandlers`) |
| `storefrontRedirect` | `handleShopifyRedirects()` |
| Codegen (`.generated.d.ts`) | Type inference from the `gql()` branded string (`StorefrontApi.ResultOf`) |

## 3. Feature inventory

Statuses below were updated after implementation and testing (see docs/FEATURE_IMPLEMENTATION.md for verification).

Status legend: **Real** = real Hydrogen code path; **Mock adapter** = real Hydrogen code
running against the local mock Storefront API; **Credentials** = needs a real store;
**Custom** = storefront feature built by the app, not a Hydrogen primitive;
**Not in version** = not shipped by 2026.10.3.

"Where" refers to routes in this app. `/lab/<section>` is the Hydrogen playground.

### A. Storefront API client
| Feature | API | What it does | Where | Status | Credentials? | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| Typed GraphQL | `gql()`, `StorefrontApi.ResultOf` | Type-infers results from the query string; no codegen | every loader, `/lab/storefront-api` | Implemented | No | [client](https://shopify.dev/docs/api/hydrogen/latest) |
| Client types | `createStorefrontClient({type:"public"\|"private"\|"private_no_buyer_context"})` | Token/buyer-context aware clients | `app/lib/shopify/storefront.server.ts` | Implemented | Private token for `private` | same |
| Injectable fetch | `config.fetch` | Swap transport; used for DEMO_MODE | `app/lib/mock-api` | Implemented (mock adapter) | No | skill `hydrogen-storefront-client` |
| Errors | `StorefrontApiError`, `StorefrontTimeoutError`, `errors[]` | Transport errors throw; GraphQL errors return | `/lab/storefront-api` | Implemented | No | same |
| i18n auto-injection | `$country`/`$language` + `@inContext` | Locale filled from request context | all queries | Implemented | No | skill `hydrogen-markets` |

### B. Request handlers
| Feature | API | Where | Status | Credentials? |
| --- | --- | --- | --- | --- |
| Pre-routing gate | `handleShopifyRoutes()` | root middleware | Implemented | No |
| Post-404 redirects | `handleShopifyRedirects()` (`/admin`, URL redirects, standard routes) | root middleware | Implemented | `/admin` + URL redirects need a store |
| Cart API | `createCartServerHandlers()` → `/api/cart` | root middleware | Implemented (mock adapter) | No |
| Predictive search API | `createPredictiveSearchServerHandlers()` → `/api/predictive-search` | root middleware | Implemented (mock adapter) | No |
| Checkout redirect | `/checkout` → `cart.checkoutUrl` | root middleware | Implemented (mock adapter: redirects to /demo-checkout) | Real checkout needs a store |
| SFAPI proxy | `/api/2026-10/graphql.json` | root middleware | Implemented (demo: served by mock API) | No |
| MCP / UCP proxies | `/api/mcp`, `/.well-known/ucp` | `/lab/agentic` | Implemented (demo: simulated MCP + UCP profile) | Yes for real Storefront MCP |
| Variant id redirects | `?variant=<id>` via `routeTemplates` | product route | Implemented | No |
| Route templates | `defineShopifyRouteTemplates()` | `app/lib/shopify/routes.ts` | Implemented | No |

### C. Product and collection primitives
| Feature | API | Where | Status |
| --- | --- | --- | --- |
| Variant selection | `createProductComponents()`, `getSelectedProductOptions`, `buildProductSelectionSearchParams`, `canAddToCart` | `/products/:handle` | Implemented |
| Product form | `useProductForm().register/formProps` | PDP, quick add | Implemented |
| Collection browsing | `CollectionProvider`, `useCollection`, `parseCollectionParams`, `serializeCollectionParams`, `getFilterRemovalUrl`, `getSortByValue`, `isFilterInputActive` | `/collections/:handle`, `/search` | Implemented |
| Pagination | cursor GET links (`after`) | collection/search | Implemented |

### D. Cart
| Feature | API | Where | Status |
| --- | --- | --- | --- |
| Cart store + optimistic UI | `createCartComponents()` → `CartProvider`, `useCart`, `useCartForm`, `useCartActions` | drawer, `/cart` | Implemented |
| Server-seeded cart | `cartHandlers.get()` → `initialData` | root loader | Implemented |
| Progressive enhancement | native form POST to `/api/cart` sets cookie | `/cart` | Implemented |
| Drawer | `<dialog>` + `window.Shopify.actions.openCart` | root layout | Implemented |
| Custom cart fields | `fragment: CartFragment` | discount allocations, inventory | Implemented |
| Out-of-band mutation | `refresh()` after gift card apply | `/cart` | Implemented |

### E. Search
`PredictiveSearchProvider`, `usePredictiveSearch`, `usePredictiveSearchForm`, `getPredictiveSearchItemUrl`; full `/search` page reusing the collection browser. Implemented (mock adapter).

### F. Customer accounts
| Feature | API | Status | Credentials? |
| --- | --- | --- | --- |
| OAuth login/authorize/refresh/logout | `createCustomerSession`, `createCustomerAccountServerHandlers` | Implemented (live mode; demo uses a profile picker) | **Yes**: shop id, client id, HTTPS origin |
| Typed CAAPI queries | `@shopify/hydrogen/customer-account` `gql` + `createCustomerAccountClient` | Implemented (demo: mock CAAPI via injected `fetch`) | Live needs token |
| Cart buyer identity sync | `cartServerHandlers` option | Not enabled by default; documented in SHOPIFY_CONNECTION.md | Yes |

### G. Markets
`defineShopifyI18n` (pathname routing), `getLocalizedHref`, `getSupportedLocales`, `formatMoney` with locale; mock API converts prices per market. **Implemented.**

### H. Analytics
`ShopifyScripts`, `window.Shopify.analytics`, `AnalyticsEvent`, `useCartAnalytics`, `consent: {mode: "custom-banner"}`, `addDestination`. **Implemented.** Shopify's own analytics delivery and PerfKit are disabled in demo mode. Customer Privacy's `consentManagement` call is answered by a simulated endpoint so consent gating works locally. **Implemented.**

### I. Shop Pay
`ShopPayButton` (React) renders locally with no external script. **Implemented.** Real checkout needs a store with Shop Pay enabled.

### J. Performance
`Cache.long/short/none`, `createRunWithCache`, streaming with React Router promises + `Suspense`, CDN image transforms. Caching only engages on runtimes with a `cache` store (Oxygen); Node has none, so it is demonstrated, not enabled. **Implemented** (streaming, images, SSR); **requires Oxygen** (caching).

### K. SEO
Route `meta`, canonical links, JSON-LD, `/sitemap.xml`, `/robots.txt` (skill `hydrogen-robots-txt`). App-owned (Hydrogen ships no SEO helper). **Implemented.**

### L. Oxygen
Worker contract documented (`hydrogen-oxygen` skill) and summarised in `/lab/oxygen`. The app runs on Node; code paths are worker-friendly. **Not deployed** (needs a Shopify Oxygen deployment).

### M. Agentic commerce
`handleShopifyRoutes` proxies `/api/mcp` and `/.well-known/ucp` to the real store; WebMCP tools load via `initializeShopifyScripts`. Without a store, the lab demonstrates the flow against a local, clearly labelled simulated MCP endpoint (same tool names) and a deterministic demo agent. **Implemented (simulated)**.

## 4. Works without a store vs needs credentials

**Works with no credentials** (demo mode, local mock API): catalog queries, collections, filters, sort, pagination, search, predictive search, cart and all cart mutations, discounts, product form, variant selection, markets pricing, money formatting, analytics bus (local destination), consent banner, Shop Pay button rendering, SEO, robots, sitemap, demo account pages.

**Also works with no credentials** against `*.mock.shop` (live mode, tokenless): real network SFAPI queries, cart, predictive search.

**Needs a real store**: checkout and payment, Shop Pay checkout, Customer Account OAuth (also needs HTTPS), `/admin` redirect, Storefront URL redirects, Shopify analytics delivery, Customer Privacy for a real shop, Storefront MCP / UCP profile, product tags/metafields/menus (token-only fields).

## 5. Sources

- Installed types: `node_modules/@shopify/hydrogen/dist/**/*.d.mts`
- Version-matched skills: `.claude/skills/hydrogen-*/SKILL.md`
- https://shopify.dev/docs/api/hydrogen/latest
- https://github.com/Shopify/hydrogen
- Storefront API: https://shopify.dev/docs/api/storefront/latest
- Customer Account API: https://shopify.dev/docs/api/customer
- mock.shop directory: https://mock.shop/llms.txt
