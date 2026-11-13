import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

/**
 * Storefront routes live under an optional market prefix (`/:locale?`), so
 * /products/x and /en-ca/products/x render the same route in different markets
 * (see app/lib/shopify/i18n.ts). Hydrogen-owned endpoints (/api/cart,
 * /api/predictive-search, /checkout, account OAuth) are not routes: the root
 * middleware serves them before React Router runs.
 */
export default [
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route(":locale?", "routes/locale.tsx", [
    index("routes/home.tsx"),
    route("collections", "routes/collections._index.tsx"),
    route("collections/:handle", "routes/collections.$handle.tsx"),
    route("products/:handle", "routes/products.$handle.tsx"),
    route("search", "routes/search.tsx"),
    route("cart", "routes/cart.tsx"),
    route("wishlist", "routes/wishlist.tsx"),
    route("compare", "routes/compare.tsx"),
    route("bundle", "routes/bundle.tsx"),
    route("pages/:handle", "routes/pages.$handle.tsx"),
    route("policies/:handle", "routes/policies.$handle.tsx"),
    route("blogs/:blogHandle", "routes/blogs.$blogHandle.tsx"),
    route("blogs/:blogHandle/:articleHandle", "routes/blogs.$blogHandle.$articleHandle.tsx"),
    route("account/login", "routes/account.login.tsx"),
    route("account/demo-logout", "routes/account.demo-logout.tsx"),
    layout("routes/account.tsx", [
      route("account", "routes/account._index.tsx"),
      route("account/orders", "routes/account.orders._index.tsx"),
      route("account/orders/:id", "routes/account.orders.$id.tsx"),
      route("account/addresses", "routes/account.addresses.tsx"),
    ]),
    route("demo-checkout", "routes/demo-checkout.tsx"),
    route("newsletter", "routes/newsletter.ts"),
    route("quick-view", "routes/quick-view.ts"),
    route("recommendations", "routes/recommendations.ts"),
    route("product-cards", "routes/product-cards.ts"),
    route("lab-probe", "routes/lab-probe.ts"),
    route("lab", "routes/lab.tsx", [index("routes/lab._index.tsx"), route(":section", "routes/lab.$section.tsx")]),
    route("*", "routes/$.tsx"),
  ]),
] satisfies RouteConfig;
