# Architecture

## 1. Hydrogen 2026.10 in one paragraph

Hydrogen is no longer a framework that owns the request. It's a library of
**server handlers** (cart, predictive search, customer account, checkout, proxies),
**client stores** (cart, product form, collection browse, predictive search) with thin
React bindings, and **helpers** (`gql`, `formatMoney`, i18n, routing, analytics bus,
Shop Pay). The app composes them inside React Router's middleware, loaders and components.

## 2. Request lifecycle

```
Browser
  │
  ▼
root middleware (app/lib/shopify/middleware.server.ts)
  ├─ DEMO_MODE only:
  │    /api/{version}/graphql.json  → mock SFAPI (incl. simulated consentManagement)
  │    /api/mcp, /api/ucp/mcp       → simulated Storefront MCP
  │    /cart/{id}:{qty}, /buy/…     → mock cart + Hydrogen cart cookie
  │    /.well-known/ucp, /admin     → answered locally (never a real shop domain)
  ├─ createShopifyRequestContext({ request, i18n })   // market from URL (or Referer for /api/cart)
  ├─ createStorefrontClient({ type: "public", requestContext, config: { fetch: mock? } })
  ├─ createSessionManager(request)                     // signed HttpOnly cookie
  ├─ handleShopifyRoutes({ …, routeTemplates, handlers: [cart, predictive, account?] })
  │     └─ matched → response (Hydrogen applies request-context headers)
  ├─ context.set(shopifyContext, { storefront, requestContext, session, customer })
  ├─ next()  → React Router loaders/actions/render
  ├─ 404 → handleShopifyRedirects()
  └─ commit session → requestContext.applyResponseHeaders()
```

## 3. Data access: one interface, two transports

The data-access interface **is the Storefront API**, and for accounts, the Customer
Account API. All loaders use typed `gql()` documents from `app/lib/queries/*.server.ts`
through the clients Hydrogen creates. Only the transport changes:

| | DEMO_MODE=true | DEMO_MODE=false |
| --- | --- | --- |
| Storefront client `fetch` | `createMockStorefrontFetch()` | global fetch → `PUBLIC_STORE_DOMAIN` |
| Customer Account client `fetch` | `createMockCustomerAccountFetch()` | global fetch → Shopify |
| Account auth | demo profile picker → session item | Hydrogen OAuth handlers |
| Reviews text | `ReviewsProvider` (mock) | `ReviewsProvider` (none configured) |

UI components never import `app/mocks`. Switching modes changes no component code; this was
verified by running the same build against `gadgets.mock.shop`.

### The mock API (`app/lib/mock-api`)

- `graphql.server.ts`: builds an executable schema from the introspection JSON shipped in
  `@shopify/hydrogen`, parses and **validates** every document (invalid fields fail like on
  Shopify), and resolves fields from plain objects whose function-valued properties receive
  the field arguments. It reads `@inContext(country, language)` for market pricing.
- `storefront/catalog.server.ts`: products and variants, Shopify Markets presentment pricing and
  rounding, the **v1 `encodedVariantExistence` / `encodedVariantAvailability` encoding** that
  Hydrogen's product form store decodes, filters (availability, price range, type, option
  swatches), sorting, search scoring, pagination cursors.
- `storefront/cart.server.ts`: server-side carts (in memory, survive HMR), line add/update/remove
  with stock clamping and warnings, discount codes (percentage / fixed / free shipping, minimums,
  scopes, expiry, exclusivity), automatic bundle discounts, gift cards, line and order allocations
  in integer minor units, and a checkout URL pointing at `/demo-checkout`.
- `customer-account/index.server.ts`: customer profile, addresses CRUD (server-side overlay),
  orders, fulfillments and tracking, all derived from the access token.
- `mcp.server.ts`: JSON-RPC MCP endpoint mirroring Storefront MCP tool names.
- `demo-routes.server.ts`: keeps the fictional shop fully local.

## 4. Client state

| Concern | Owner |
| --- | --- |
| Cart | Hydrogen cart store via `createCartComponents<typeof cartHandlers>()`; seeded by the root loader (promise; resolved on `/cart` for no-JS) |
| Variant selection | `createProductComponents<ProductData>()`; URL is the source of truth (`onSelect` → `navigate(replace, preventScrollReset)`) |
| Collection / search browse | `CollectionProvider` + GET forms |
| Predictive search | `PredictiveSearchProvider` → `/api/predictive-search` |
| Analytics | `window.Shopify.analytics` bus from Shopify script tags + `useCartAnalytics()` |
| Consent | NOVA banner → `consent: { mode: "custom-banner", setup }` → Customer Privacy |
| Wishlist, compare, recently viewed, recent searches | `localStorage` handles only (custom) |

## 5. Markets

`defineShopifyI18n` (pathname routing) is the single definition. Routes live under an
optional `/:locale?` segment; the `locale.tsx` layout 404s unknown prefixes. Links go through
`~/lib/storefront/locale` (`Link`, `useLocalizedPath`) so shoppers stay in their market. The
React `CartProvider` always calls `/api/cart`, so the middleware derives that request's market
from the same-origin Referer via Hydrogen's documented `x-storefront-url` header.

## 6. Rendering and performance

- Every page is server-rendered; below-the-fold data (recommendations, reviews, testimonials)
  streams via React Router promises + `<Suspense>/<Await>`.
- Images: plain `<img>` with Shopify CDN `width/height/crop` transforms and `srcset`
  (`app/lib/storefront/image.ts`); the hero image is eager with `fetchpriority=high`.
- `gql()` lives only in `*.server.ts` modules, so documents never ship to the browser.
- Sub-request caching (`Cache.long()` etc.) is documented and demonstrated in the lab but not
  enabled on Node, which has no `CacheStorage`. Enable it on Oxygen by passing `cache` + `waitUntil`.

## 7. Design system

Tokens are defined once in `@theme` (`app/app.css`): a warm neutral palette (paper / bone / sand /
stone / graphite / ink), one accent (ember) plus semantic states, a fluid display type scale,
Inter Tight + Instrument Serif italics + JetBrains Mono, and restrained radii. Component primitives
(`.btn-*`, `.input`, `.badge-*`, `.chip`, `.status-*`, `.prose-nova`, `.code-block`, dialogs) live
in `@layer components`. Dialogs are native `<dialog>` + `showModal()` with `@starting-style`
transitions. Neutral and accent tokens meet WCAG AA contrast (axe-core verified).
