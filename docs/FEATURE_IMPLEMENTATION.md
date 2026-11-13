# Feature implementation

Where each feature lives, which Hydrogen API it uses, and how it was verified.
"Verified" means it was exercised in this repo against the running app: headless Chrome
interaction scripts, curl against dev and production builds, or both.

Legend: **H** = Hydrogen primitive · **C** = custom storefront feature · **M** = mock-only simulation

## Storefront

| Feature | Files | Type | Verified |
| --- | --- | --- | --- |
| Editorial homepage (hero, collections, best sellers, story, statement, new arrivals, moments, recently viewed, picks, reviews, journal, newsletter) | `routes/home.tsx` | C | Desktop + 390px screenshots |
| Collection grid, filters (availability, price range, type, swatches), sort, chips, clear all, load more, no-JS GET form | `components/collection/browse.tsx`, `routes/collections.$handle.tsx` | H | curl with filter params, mobile overflow check |
| Search page with `q` preserved, matching collections, empty + no-results recommendations | `routes/search.tsx` | H | curl (`walnut`, `zzz`) |
| Predictive search overlay, recent + popular searches, tracking URLs | `components/search/search-overlay.tsx` | H (+C recent) | `/api/predictive-search` + lab demo |
| PDP: gallery with variant image jump, GET-link options, disabled non-existent, sold-out styling, stock messaging, quantity, add to bag, buy now, Shop Pay, accordions, reviews, FBT, related, mobile buy bar, JSON-LD | `routes/products.$handle.tsx`, `components/product/*` | H (+C) | Headless: select Slate → URL `?Color=Slate`, price/compare-at; SSR option states |
| Quick add & quick view | `lib/storefront/quick-add.ts`, `components/product/quick-view.tsx` | H (Standard Actions `updateCart`) + C | Headless |
| Cart drawer (optimistic, rapid clicks, discount, free-shipping progress, recommendations) | `components/cart/*` | H | Headless: add → drawer opens optimistically; 3 rapid "+" settle at 4; WELCOME10 −10% |
| Cart page, gift cards (out-of-band mutation + `refresh()`), order note, gift wrap attribute | `routes/cart.tsx`, `components/cart/cart-summary.tsx` | H | No-JS: form POST add, set quantity, discount (curl) |
| Checkout redirect | Hydrogen `/checkout` → `/demo-checkout` | H + M | Headless + curl 302 |
| Customer account: login (demo), profile edit, addresses CRUD, orders, order detail with tracking timeline, logout | `routes/account*.tsx`, `lib/queries/account.server.ts` | H (CAAPI client) + M | Headless: login → orders → add address (2→3) → logout; no token in HTML |
| Markets: selector, localized pricing & formatting, locale-preserving links | `lib/shopify/i18n.ts`, `lib/storefront/locale.tsx` | H | curl `/en-ca` ($413.00 CAD), `/fr-fr` (€), `/ja-jp` (¥) |
| Analytics events (page/product/collection/search/cart, cart deltas) + consent banner | `components/analytics.tsx`, `lib/storefront/analytics.ts`, `lib/storefront/consent.ts` | H | Headless: destination receives events after Accept, none after Decline |
| SEO: meta, canonical, JSON-LD (Organization, Product, BreadcrumbList, CollectionPage, Article), sitemap, robots | route `meta` exports, `routes/sitemap.ts`, `routes/robots.ts` | C | `/lab/seo` extraction, curl |
| Content: About, Contact (validated form action), FAQ disclosures, policies, journal + articles with shoppable products | `routes/pages.$handle.tsx`, `routes/policies.$handle.tsx`, `routes/blogs.*` | H (SFAPI) + C | curl 200/404 |
| 404 / error boundaries | `routes/$.tsx`, `routes/locale.tsx`, `root.tsx` | C | curl `/nope`, unknown locale `/xx` |

## Advanced experiences (all custom, clearly labelled in the UI)

| Feature | Notes |
| --- | --- |
| Quick add | Single-variant products add via `window.Shopify.actions.updateCart` (same optimistic path as forms); multi-variant products open quick view |
| Quick product preview | Shared `<dialog>`, same product form as the PDP, no URL sync |
| Recently viewed | localStorage handles; cards fetched live (`/product-cards`) |
| Wishlist | localStorage; `/wishlist` |
| Product comparison | Up to 4; `/compare` table |
| Frequently bought together | `productRecommendations(intent: COMPLEMENTARY)`; adds all lines in one `updateCart` call; no client-side bundle total |
| Bundle builder | `/bundle`; lines carry a private `_bundle` attribute |
| Personalised picks | `productRecommendations(RELATED)` seeded by the last viewed product |
| Recently searched | localStorage; overlay + search page |
| Discount scenarios | 7 codes + 2 automatic discounts + gift cards (see mock.md) |
| Free shipping progress | Per-currency threshold; progress bar estimate from the server subtotal |
| Variant-specific images | `variant.image` → gallery index |
| Stock messaging | `quantityAvailable` (`@include(if: $withInventory)`, enabled in demo mode) |
| Responsive navigation | Desktop nav + left `<dialog>` drawer menu on mobile; market selector |
| Mobile experience | Swipe gallery, sticky mobile buy bar, compact card actions, no horizontal overflow (verified at 390px) |

## Quality gates (last run)

- `npm run typecheck`: route typegen + `tsc` + `hydrogen gql check --fail-on-warn` → no problems
- `npm run lint` → clean
- `npm run build` → success; production server smoke test → all routes 200 (404 where intended)
- Internal links on the homepage: 54/54 return 200
- Image URLs: 149/149 Shopify CDN images load at the transform sizes used
- axe-core (WCAG 2 A/AA) on home, collection, PDP, cart, search, login, contact, journal, lab → 0 violations
- Live mode (`DEMO_MODE=false`, `gadgets.mock.shop`): catalog renders, PDP add-to-cart creates a real cart
