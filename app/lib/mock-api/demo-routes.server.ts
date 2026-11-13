/**
 * DEMO_MODE replacements for Hydrogen routes that would otherwise proxy or
 * redirect to the shop's real Shopify domain. The demo shop is fictional, so
 * these answer locally:
 *  - /cart/{variantId}:{qty},…  cart permalinks: create a mock cart, set
 *    Hydrogen's cart cookie, redirect to the cart's checkoutUrl
 *  - /buy/…                     UCP buy permalinks: same idea, to /cart
 *  - /.well-known/ucp           a simulated, clearly labelled UCP profile
 *  - /admin                     explains instead of redirecting
 */
import { createCartCookie } from "@shopify/hydrogen";
import { SHOP } from "~/mocks";
import { runMockGraphql } from "./graphql.server";
import { mockStorefrontServer } from "./storefront/index.server";

const PERMALINK_RE = /^\/(cart|buy)\/((?:\d+:\d+,?)+)$/;

export async function handleDemoOnlyRoutes(request: Request, url: URL): Promise<Response | null> {
  const permalink = PERMALINK_RE.exec(url.pathname);
  if (permalink && request.method === "GET") {
    const lines = permalink[2].split(",").filter(Boolean).map((pair) => {
      const [id, qty] = pair.split(":");
      return { merchandiseId: `gid://shopify/ProductVariant/${id}`, quantity: Number(qty) || 1 };
    });
    const result = await runMockGraphql(mockStorefrontServer(url.origin), {
      query: "mutation($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { id checkoutUrl } } }",
      variables: { lines },
    });
    const cart = (result.data as { cartCreate?: { cart?: { id: string; checkoutUrl: string } } } | undefined)?.cartCreate?.cart;
    if (!cart) return new Response("Invalid permalink", { status: 400 });
    const location = permalink[1] === "buy" ? "/cart" : `${cart.checkoutUrl}${url.searchParams.has("payment") ? `&payment=${url.searchParams.get("payment")}` : ""}`;
    return new Response(null, { status: 302, headers: { location, "set-cookie": createCartCookie(cart.id), "cache-control": "no-store", "x-nova-simulated": "cart-permalink" } });
  }
  if (url.pathname === "/.well-known/ucp" && (request.method === "GET" || request.method === "HEAD")) {
    const body = {
      _note: "SIMULATED in DEMO_MODE. With a real store, handleShopifyRoutes proxies Shopify's managed UCP business profile.",
      name: SHOP.name,
      description: SHOP.description,
      endpoints: { mcp: `${url.origin}/api/mcp` },
    };
    return new Response(request.method === "HEAD" ? null : JSON.stringify(body, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", "x-nova-simulated": "ucp-profile" } });
  }
  if (url.pathname === "/admin") {
    return new Response("DEMO_MODE: /admin redirects to your shop's Shopify Admin when connected to a real store.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "x-nova-simulated": "admin-redirect" } });
  }
  return null;
}
