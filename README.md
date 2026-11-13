# NOVA: a Shopify Hydrogen 2026.10 storefront and feature lab

NOVA is a fictional premium audio, lighting and desk brand. This repo is two things:

1. **A production-quality storefront**: editorial homepage, collections with filters, product pages with variant logic, cart drawer, search, customer accounts, markets, wishlist, compare and a bundle builder.
2. **A Hydrogen learning playground** at **`/lab`**: 13 sections (A–M) that run Hydrogen's features live, show the code and the exact API, and label honestly what is real Hydrogen, what runs over a mock API, and what needs a real store.

It runs **with no Shopify credentials**. In demo mode the Storefront API and the Customer Account API are served locally by a GraphQL executor built on the schemas that ship inside `@shopify/hydrogen`, so every Hydrogen handler, store and typed query runs unchanged.

## Stack

| | |
| --- | --- |
| Hydrogen | `@shopify/hydrogen@2026.10.3`, the framework-agnostic library release |
| Framework | React Router 8 (framework mode, SSR, middleware), React 19, Vite 8 |
| Styling | Tailwind CSS 4 with a custom token-based design system (`app/app.css`) |
| Mock API | `graphql` 17 executing over `storefront.schema.json` / `customer-account.schema.json` |
| Imagery | Shopify CDN photography from the public mock.shop catalogs (CDN transforms work) |

## Quick start

```bash
npm install
cp .env.example .env          # DEMO_MODE=true by default
npm run dev                   # http://localhost:5173
```

Open:

- `/`: storefront
- `/lab`: Hydrogen feature playground
- `/account/login`: sign in as one of ten demo customers

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | `hydrogen skills check --mode=warn` + React Router dev server |
| `npm run typecheck` | Route typegen, `tsc`, and **`hydrogen gql check --fail-on-warn`** (validates every `gql()` document against the packaged schemas) |
| `npm run lint` | ESLint (TypeScript + React hooks) |
| `npm run build` / `npm start` | Production build / Node server (`PORT` to change the port) |
| `node scripts/generate-mock-md.ts` | Regenerates the data tables in `mock.md` from the fixtures |

## Demo mode vs live mode

```bash
DEMO_MODE=true    # default: local mock Storefront + Customer Account APIs
DEMO_MODE=false   # use PUBLIC_STORE_DOMAIN
```

`DEMO_MODE=false` with `PUBLIC_STORE_DOMAIN=gadgets.mock.shop` runs against a **real** (tokenless) Storefront API with no credentials. Catalog, cart and search then go over the network. For a real store, see [docs/SHOPIFY_CONNECTION.md](docs/SHOPIFY_CONNECTION.md).

A badge in the bottom-left corner always shows which mode is active.

## Things to try

- **Variants:** `/products/keyframe-75-keyboard`. Midnight + Tactile doesn't exist (disabled) and Sand + Tactile is sold out (still selectable). Selecting a value updates the URL without reloading.
- **Variant images and stock:** `/products/halo-anc-headphones`. Each colour swaps the gallery. Cognac shows "Only 3 left" and Onyx is sold out.
- **Cart:** discount codes `WELCOME10`, `SAVE20`, `NOVA25`, `SOUND15`, `DESKSET`, `FREESHIP`, `SUMMER25` (expired); gift cards `NOVAGIFT50` and `NOVAGIFT0` (rejected). Studio Condenser Mic + Mic Mount Kit + Duo Interface triggers an automatic bundle discount.
- **Markets:** `/en-ca`, `/en-gb`, `/fr-fr`, `/en-au` and `/ja-jp` (the header selector, or `/lab/markets`).
- **No JavaScript:** disable JS. Filters, sort, pagination, variant links, add to cart, cart quantity and discount forms all still work.
- **Agentic:** `/lab/agentic` runs a deterministic agent through MCP tools: search, then details, then cart.

## Project layout

```
app/
  root.tsx                 document, middleware, root loader (cart bootstrap, layout data)
  routes.ts                route config (optional /:locale? market prefix)
  routes/                  storefront, account, lab and resource routes
  components/              UI (cart, product, collection, search, layout, lab)
  lib/shopify/             Hydrogen wiring: env, i18n, route templates, middleware, handlers, session, customer
  lib/queries/*.server.ts  Storefront & Customer Account API documents (server-only gql)
  lib/storefront/          client bindings & helpers (cart, product, money, image, analytics, locale…)
  lib/mock-api/            mock SFAPI, mock CAAPI, simulated MCP, demo-only routes
  lib/lab/features.ts      lab content registry
  mocks/                   NOVA business fixtures (see mock.md)
docs/                      audit, architecture, feature implementation, Shopify connection
mock.md                    business & demo data specification
```

## Documentation

- [mock.md](mock.md): the mock dataset specification
- [docs/HYDROGEN_FEATURE_AUDIT.md](docs/HYDROGEN_FEATURE_AUDIT.md): what Hydrogen 2026.10 offers and the status of each feature
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): request lifecycle, data access, mock API design
- [docs/FEATURE_IMPLEMENTATION.md](docs/FEATURE_IMPLEMENTATION.md): where and how each feature is built
- [docs/SHOPIFY_CONNECTION.md](docs/SHOPIFY_CONNECTION.md): connecting a real store

## Security notes

- No private token or session secret is ever read by browser code: env access lives in `app/lib/shopify/env.server.ts` and only a non-secret `getPublicRuntime()` subset is serialized.
- Customer Account tokens stay in a signed HttpOnly session cookie and are never placed in loader data.
- In demo mode the fictional shop never proxies or redirects to a real `myshopify.com` domain, and Shopify's own analytics and PerfKit delivery are disabled.
