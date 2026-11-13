/**
 * Customer account access behind one interface:
 * - live mode: Hydrogen's OAuth `customerSession` + `createCustomerAccountClient`
 * - DEMO_MODE: a demo session item + the same client with the mock CAAPI fetch
 *
 * Loaders call `customer.isLoggedIn()` / `customer.client()` and never see tokens.
 */
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerAccountServerHandlers,
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
} from "@shopify/hydrogen/customer-account";
import { createMockCustomerAccountFetch, DEMO_TOKEN_PREFIX } from "~/lib/mock-api/customer-account/index.server";
import { getEnv } from "./env.server";
import type { AppSessionManager } from "./session.server";

export const DEMO_CUSTOMER_KEY = "novaDemoCustomerId";

let liveSession: CustomerSession | null = null;
export function getLiveCustomerSession() {
  const env = getEnv();
  if (!env.customerAccountEnabled) return null;
  liveSession ??= createCustomerSession({ shopId: env.shopId!, customerAccountApiClientId: env.customerAccountClientId! });
  return liveSession;
}

let liveHandlers: ReturnType<typeof createCustomerAccountServerHandlers> | null = null;
/** Registered with handleShopifyRoutes in live mode: /account/login, /authorize, /refresh, /logout. */
export function getCustomerAccountHandlers() {
  const session = getLiveCustomerSession();
  if (!session) return null;
  liveHandlers ??= createCustomerAccountServerHandlers({ customerSession: session });
  return liveHandlers;
}

export type CustomerAccess = {
  mode: "demo" | "live" | "unavailable";
  isLoggedIn(): Promise<boolean>;
  /** Returns a client bound to the current customer's token, or null when not signed in. */
  getClient(): Promise<{ client: CustomerAccountClient; accessToken: string } | null>;
  /** True when signed in but the access token needs a refresh redirect (live only). */
  needsRefresh(): Promise<boolean>;
};

export function createCustomerAccess(requestContext: ShopifyRequestContext, sessionManager: AppSessionManager, origin: string): CustomerAccess {
  const env = getEnv();
  if (env.demoMode) {
    const client = createCustomerAccountClient({ shopId: env.shopId!, requestContext, fetch: createMockCustomerAccountFetch(origin) });
    const id = () => sessionManager.get(DEMO_CUSTOMER_KEY) as string | undefined;
    return {
      mode: "demo",
      isLoggedIn: async () => Boolean(id()),
      getClient: async () => (id() ? { client, accessToken: `${DEMO_TOKEN_PREFIX}${id()}` } : null),
      needsRefresh: async () => false,
    };
  }
  const session = getLiveCustomerSession();
  if (!session) {
    return { mode: "unavailable", isLoggedIn: async () => false, getClient: async () => null, needsRefresh: async () => false };
  }
  const client = createCustomerAccountClient({ shopId: env.shopId!, requestContext });
  return {
    mode: "live",
    isLoggedIn: () => Promise.resolve(session.isLoggedIn(sessionManager, requestContext)),
    getClient: async () => {
      const accessToken = await session.getAccessToken(sessionManager, requestContext);
      return accessToken ? { client, accessToken } : null;
    },
    needsRefresh: async () =>
      (await session.isLoggedIn(sessionManager, requestContext)) && !(await session.getAccessToken(sessionManager, requestContext)),
  };
}
