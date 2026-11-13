# Connecting a real Shopify store

The app is designed so that moving from demo data to a real store changes **configuration
only**. The UI and loaders use the same Storefront API and Customer Account API documents
in both modes.

## Step 0: try live mode without a store

```bash
DEMO_MODE=false
PUBLIC_STORE_DOMAIN=gadgets.mock.shop
# PUBLIC_STOREFRONT_API_TOKEN=   (leave commented: tokenless)
```

This uses a real, public, tokenless Storefront API. Catalog, search and carts work; checkout and
customer accounts don't (mock.shop doesn't support them). Navigation falls back to that shop's
collections, and NOVA-specific content (home hero products, reviews, journal) is hidden or replaced
when the data isn't there.

## Step 1: create the Hydrogen storefront in Shopify

1. In the Shopify admin, install the **Hydrogen** (or **Headless**) sales channel and create a storefront.
2. Copy the **public Storefront API access token** (and optionally the private token).
3. Note the **shop ID** (numeric) and the **storefront ID**.
4. Publish products and collections to the storefront's sales channel.

## Step 2: environment variables

```bash
DEMO_MODE=false
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=xxxxxxxx
PUBLIC_STOREFRONT_ID=1000000000
PUBLIC_CHECKOUT_DOMAIN=checkout.your-domain.com   # optional, for CSP
SHOP_ID=12345678
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=shp_xxxxxxxx
CUSTOMER_ACCOUNT_SESSION_SECRET=<long random string>
```

All of these are read only in `app/lib/shopify/env.server.ts`. Never import that module from
client code, and never expose `PRIVATE_STOREFRONT_API_TOKEN` or the session secret.

To use a **private** token with buyer context, change `type: "public"` in
`app/lib/shopify/middleware.server.ts` to `type: "private"`, pass `privateStorefrontToken`,
and pass a trusted `buyerIp` (e.g. `oxygen-buyer-ip` on Oxygen) to `createShopifyRequestContext`.

## Step 3: scopes and data expectations

| Feature | Requirement |
| --- | --- |
| Stock messaging (`quantityAvailable`) | Enable `unauthenticated_read_product_inventory`, then set `withInventory: true` in the product loaders (currently `demoMode`) |
| Ratings | A reviews app writing `reviews.rating` / `reviews.rating_count` product metafields, exposed to the Storefront API |
| Review text | Implement `ReviewsProvider` in `app/lib/reviews.server.ts` for your app's API |
| Product details accordion | Optional `nova.details` JSON product metafield (falls back to description) |
| Collection kicker | Optional `nova.kicker` collection metafield |
| Navigation | Collections with handles `sound`, `studio`, `desk`, `light`, `power`, `mobile` (otherwise the first six collections are used) |
| Home hero / feature | Products with handles `halo-anc-headphones` and `keyframe-75-keyboard`, or edit `HOME_QUERY` |
| Markets | Configure the same countries in Shopify Markets, or edit `app/lib/shopify/i18n.ts` |
| Free-shipping bar | Match `app/lib/storefront/shipping.ts` to your shipping profile |
| Discounts / gift cards | Create them in the admin; the UI reads `applicable` from the cart |

## Step 4: customer accounts (OAuth)

1. In the Hydrogen channel's **Customer Account API** settings, copy the client ID.
2. Customer Account OAuth needs an HTTPS origin. For local development use
   `localHttps` from `@shopify/hydrogen/vite` (skill: `hydrogen-local-https`) or a tunnel, and
   register the callback (`/account/authorize`), JavaScript origin and logout URLs.
3. With `SHOP_ID` + `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` set and `DEMO_MODE=false`, the middleware
   registers `createCustomerAccountServerHandlers` automatically and `/account/login` redirects to
   Shopify's hosted login. The account pages need no changes.
4. Optional: create the cart handlers with `customerSession` and pass them as `cartServerHandlers` to
   sync the cart's buyer identity on login and logout.

## Step 5: analytics and consent

In live mode `ShopifyScripts` loads Shopify's analytics and PerfKit for your shop. The NOVA banner
drives Customer Privacy through `consent: { mode: "custom-banner", setup }`. Replace it with your
CMP by implementing the same `setup()` contract (`app/lib/storefront/consent.ts`), or switch to
`mode: "default-banner"` to use Shopify's banner.

## Step 6: deploy

- **Node** (current): `npm run build && npm start`.
- **Oxygen**: follow the `hydrogen-oxygen` skill. Add a worker entry (`server.ts`) and MiniOxygen
  via `@shopify/hydrogen/vite`, pass `env`, `caches.open("hydrogen")` and `waitUntil` into
  `createStorefrontClient`, and opt catalog queries into `Cache.long()/short()`. Keep
  `DEMO_MODE=false` in production: the mock cart store lives in process memory.

## What changes nothing

Loaders, queries, components, cart, product forms, browse, search, the analytics wiring and Shop
Pay all stay the same. Delete `app/mocks` and `app/lib/mock-api` only if you remove demo mode
(also remove their imports in `middleware.server.ts`, `customer.server.ts`, `reviews.server.ts`,
`routes/account.login.tsx` and `routes/demo-checkout.tsx`).
