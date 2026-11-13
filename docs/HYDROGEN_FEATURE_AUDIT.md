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

Status legend: **Real** = real Hydrogen code path; **Mock adapter** = real Hydrogen code
running against the local mock Storefront API; **Credentials** = needs a real store;
**Custom** = storefront feature built by the app, not a Hydrogen primitive;
**Not in version** = not shipped by 2026.10.3.

"Where" refers to routes in this app. `/lab/<section>` is the Hydrogen playground.

### A. Storefront API client
| Feature | API | What it does | Where | Status | Credentials? | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| Typed GraphQL | `gql()`, `StorefrontApi.ResultOf` | Type-infers results from the query string; no codegen | every loader, `/lab/storefront-api` | Planned | No | [client](https://shopify.dev/docs/api/hydrogen/latest) |
| Client types | `createStorefrontClient({type:"public"\|"private"\|"private_no_buyer_context"})` | Token/buyer-context aware clients | `app/lib/shopify/storefront.server.ts` | Planned | Private token for `private` | same |
| Injectable fetch | `config.fetch` | Swap transport; used for DEMO_MODE | `app/lib/mock-api` | Planned (mock adapter) | No | skill `hydrogen-storefront-client` |
| Errors | `StorefrontApiError`, `StorefrontTimeoutError`, `errors[]` | Transport errors throw; GraphQL errors return | `/lab/storefront-api` | Planned | No | same |
| i18n auto-injection | `$country`/`$language` + `@inContext` | Locale filled from request context | all queries | Planned | No | skill `hydrogen-markets` |

### B. Request handlers
| Feature | API | Where | Status | Credentials? |
| --- | --- | --- | --- | --- |
| Pre-routing gate | `handleShopifyRoutes()` | root middleware | Planned | No |
| Post-404 redirects | `handleShopifyRedirects()` (`/admin`, URL redirects, standard routes) | root middleware | Planned | `/admin` + URL redirects need a store |
| Cart API | `createCartServerHandlers()` → `/api/cart` | root middleware | Planned (mock adapter) | No |
| Predictive search API | `createPredictiveSearchServerHandlers()` → `/api/predictive-search` | root middleware | Planned (mock adapter) | No |
| Checkout redirect | `/checkout` → `cart.checkoutUrl` | root middleware | Planned (mock adapter: redirects to a demo checkout page) | Real checkout needs a store |
| SFAPI proxy | `/api/2026-10/graphql.json` | root middleware | Planned (demo: served by mock API) | No |
| MCP / UCP proxies | `/api/mcp`, `/.well-known/ucp` | `/lab/agentic` | Planned (demo: local MCP-shaped endpoint) | Yes for real Storefront MCP |
| Variant id redirects | `?variant=<id>` via `routeTemplates` | product route | Planned | No |
| Route templates | `defineShopifyRouteTemplates()` | `app/lib/shopify/routes.ts` | Planned | No |

### C. Product and collection primitives
| Feature | API | Where | Status |
| --- | --- | --- | --- |
| Variant selection | `createProductComponents()`, `getSelectedProductOptions`, `buildProductSelectionSearchParams`, `canAddToCart` | `/products/:handle` | Planned |
| Product form | `useProductForm().register/formProps` | PDP, quick add | Planned |
| Collection browsing | `CollectionProvider`, `useCollection`, `parseCollectionParams`, `serializeCollectionParams`, `getFilterRemovalUrl`, `getSortByValue`, `isFilterInputActive` | `/collections/:handle`, `/search` | Planned |
| Pagination | cursor GET links (`after`) | collection/search | Planned |

### D. Cart
| Feature | API | Where | Status |
| --- | --- | --- | --- |
| Cart store + optimistic UI | `createCartComponents()` → `CartProvider`, `useCart`, `useCartForm`, `useCartActions` | drawer, `/cart` | Planned |
| Server-seeded cart | `cartHandlers.get()` → `initialData` | root loader | Planned |
| Progressive enhancement | native form POST to `/api/cart` sets cookie | `/cart` | Planned |
| Drawer | `<dialog>` + `window.Shopify.actions.openCart` | root layout | Planned |
| Custom cart fields | `fragment: CartFragment` | discount allocations, inventory | Planned |
| Out-of-band mutation | `refresh()` after gift card apply | `/cart` | Planned |

### E. Search
`PredictiveSearchProvider`, `usePredictiveSearch`, `usePredictiveSearchForm`, `getPredictiveSearchItemUrl`; full `/search` page reusing the collection browser. Planned (mock adapter).

### F. Customer accounts
| Feature | API | Status | Credentials? |
| --- | --- | --- | --- |
| OAuth login/authorize/refresh/logout | `createCustomerSession`, `createCustomerAccountServerHandlers` | Wired for live mode | **Yes**: shop id, client id, HTTPS origin |
| Typed CAAPI queries | `@shopify/hydrogen/customer-account` `gql` + `createCustomerAccountClient` | Planned (demo: mock CAAPI via injected `fetch`) | Live needs token |
| Cart buyer identity sync | `cartServerHandlers` option | Live mode only | Yes |

### G. Markets
`defineShopifyI18n` (pathname routing), `getLocalizedHref`, `getSupportedLocales`, `formatMoney` with locale; mock API converts prices per market. Planned.

### H. Analytics
`ShopifyScripts`, `window.Shopify.analytics`, `AnalyticsEvent`, `useCartAnalytics`, `consent: {mode: "custom-banner"}`, `addDestination`. Planned. Shopify's own analytics delivery is disabled in demo mode, so no events reach Shopify for a fictional shop.

### I. Shop Pay
`ShopPayButton` (React) renders locally with no external script. Planned. Real checkout needs a store with Shop Pay enabled.

### J. Performance
`Cache.long/short/none`, `createRunWithCache`, streaming with React Router promises + `Suspense`, CDN image transforms. Caching only engages on runtimes with a `cache` store (Oxygen); Node dev has none. Planned.

### K. SEO
Route `meta`, canonical links, JSON-LD, `/sitemap.xml`, `/robots.txt` (skill `hydrogen-robots-txt`). App-owned (Hydrogen ships no SEO helper). Planned.

### L. Oxygen
Worker contract documented (`hydrogen-oxygen` skill). The app runs on Node by default. Planned (docs + compatibility notes).

### M. Agentic commerce
`handleShopifyRoutes` proxies `/api/mcp` and `/.well-known/ucp` to the real store; WebMCP tools load via `initializeShopifyScripts`. Without a store, the lab demonstrates the flow against a local MCP-shaped endpoint. Planned.

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
