import { defineShopifyRouteTemplates } from "@shopify/hydrogen";

/**
 * Shopify standard storefront routes are handled at their default paths
 * (/products/:handle, /collections/:handle, /pages/:handle, /policies/:handle,
 * /blogs/:blog/:article, /cart, /search). Add entries here only if the app moves
 * one of them. This one object is shared by handleShopifyRoutes,
 * handleShopifyRedirects, ShopifyScripts and predictive search URLs.
 */
export const routeTemplates = defineShopifyRouteTemplates({});
