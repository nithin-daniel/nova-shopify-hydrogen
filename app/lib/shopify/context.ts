/**
 * React Router request contexts (middleware → loaders). These are React
 * Router's `createContext`, not React's component context. The *values* are
 * created per request in `middleware.server.ts`.
 */
import type { ShopifyRequestContext, StorefrontClient } from "@shopify/hydrogen";
import { createContext } from "react-router";
import type { CustomerAccess } from "./customer.server";
import type { AppSessionManager } from "./session.server";

export type ShopifyAppContext = {
  storefront: StorefrontClient;
  requestContext: ShopifyRequestContext;
  session: AppSessionManager;
  customer: CustomerAccess;
  demoMode: boolean;
};

export const shopifyContext = createContext<ShopifyAppContext>();
