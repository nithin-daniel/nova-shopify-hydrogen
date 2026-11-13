/**
 * Root request lifecycle (skill: hydrogen-request-handlers, React Router shape)
 *
 *   Request
 *     → [demo only] mock SFAPI proxy + mock MCP endpoint
 *     → handleShopifyRoutes()      cart, predictive search, checkout, proxies, account OAuth
 *     → React Router (loaders/actions/render)
 *     → handleShopifyRedirects()   only when the router returned 404
 *     → commit session, apply request-context headers
 */
import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRouteHandlerGroup,
} from "@shopify/hydrogen";
import type { MiddlewareFunction } from "react-router";
import { handleMockMcp } from "~/lib/mock-api/mcp.server";
import { createMockStorefrontFetch, handleMockStorefrontProxy } from "~/lib/mock-api/storefront/index.server";
import { shopifyContext } from "./context";
import { createCustomerAccess, getCustomerAccountHandlers } from "./customer.server";
import { getEnv } from "./env.server";
import { cartHandlers, predictiveSearchHandlers } from "./handlers.server";
import { i18n } from "./i18n";
import { routeTemplates } from "./routes";
import { createSessionManager } from "./session.server";

const SFAPI_PROXY_RE = /^(?:\/[a-z]{2}-[a-z]{2})?\/api\/(?:unstable|\d{4}-\d{2})\/graphql\.json$/;
const LOCALE_FROM_REFERER_RE = /^(?:\/[a-z]{2}-[a-z]{2})?\/api\/(?:cart|predictive-search)$/;

/**
 * Hydrogen's React CartProvider and PredictiveSearchProvider always call the
 * unprefixed `/api/cart` and `/api/predictive-search`. To keep cart and search
 * prices in the shopper's market, derive the locale for those calls from the
 * same-origin Referer through Hydrogen's documented `x-storefront-url` header.
 */
function localeRequest(request: Request, url: URL) {
  if (!LOCALE_FROM_REFERER_RE.test(url.pathname)) return request;
  const referer = request.headers.get("referer");
  if (!referer) return request;
  try {
    if (new URL(referer).origin !== url.origin) return request;
  } catch {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("x-storefront-url", referer);
  return { headers };
}

export const shopifyMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const env = getEnv();
  const url = new URL(request.url);

  if (env.demoMode) {
    if (SFAPI_PROXY_RE.test(url.pathname)) return handleMockStorefrontProxy(request);
    if (url.pathname === "/api/mcp") return handleMockMcp(request);
  }

  const requestContext = createShopifyRequestContext({ request: localeRequest(request, url), i18n });
  const storefront = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: env.storeDomain,
      publicStorefrontToken: env.publicStorefrontToken,
      ...(env.demoMode ? { fetch: createMockStorefrontFetch(url.origin) } : {}),
    },
  });
  const session = await createSessionManager(request);

  const accountHandlers = getCustomerAccountHandlers();
  const handlers: ShopifyRouteHandlerGroup[] = [cartHandlers, predictiveSearchHandlers];
  if (accountHandlers) handlers.push(accountHandlers as unknown as ShopifyRouteHandlerGroup);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    storefrontClient: storefront,
    sessionManager: session,
    routeTemplates,
    handlers,
  });
  if (shopifyRoute) return shopifyRoute;

  context.set(shopifyContext, {
    storefront,
    requestContext,
    session,
    customer: createCustomerAccess(requestContext, session, url.origin),
    demoMode: env.demoMode,
  });

  let response = await next();

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient: storefront, routeTemplates });
    if (redirect) return redirect;
  }

  const sessionHeaders = await session.commit?.();
  if (sessionHeaders) {
    response = new Response(response.body, response);
    for (const [key, value] of new Headers(sessionHeaders)) response.headers.append(key, value);
  }
  requestContext.applyResponseHeaders(response.headers);
  if (env.demoMode) response.headers.set("x-nova-demo-mode", "true");
  return response;
};
