/**
 * Server-only environment access. Never import this from client modules:
 * values reach the browser only as explicit, serialized loader data.
 *
 * DEMO_MODE=true (default): the Storefront API and Customer Account API are
 * served by the local mock APIs in `app/lib/mock-api`.
 * DEMO_MODE=false: the app talks to PUBLIC_STORE_DOMAIN. With a *.mock.shop
 * domain this works without any credentials (tokenless Storefront API).
 */
export type AppEnv = {
  demoMode: boolean;
  storeDomain: string;
  publicStorefrontToken: string | undefined;
  storefrontId: string;
  shopId: string | undefined;
  customerAccountClientId: string | undefined;
  sessionSecret: string;
  checkoutDomain: string | undefined;
  /** True when Customer Account OAuth can be wired (live mode + ids present). */
  customerAccountEnabled: boolean;
};

const DEMO_SESSION_SECRET = "nova-demo-session-secret-not-for-production";

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const e = process.env;
  const demoMode = (e.DEMO_MODE ?? "true").toLowerCase() !== "false";
  const storeDomain = demoMode ? "nova-demo.myshopify.com" : (e.PUBLIC_STORE_DOMAIN ?? "");
  if (!demoMode && !storeDomain) {
    throw new Error("DEMO_MODE=false requires PUBLIC_STORE_DOMAIN (e.g. your-store.myshopify.com or gadgets.mock.shop)");
  }
  const sessionSecret = e.CUSTOMER_ACCOUNT_SESSION_SECRET || DEMO_SESSION_SECRET;
  if (!demoMode && sessionSecret === DEMO_SESSION_SECRET && e.NODE_ENV === "production") {
    console.warn("[nova] CUSTOMER_ACCOUNT_SESSION_SECRET is not set; using the demo secret. Set a strong secret in production.");
  }
  const shopId = e.SHOP_ID || undefined;
  const customerAccountClientId = e.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || undefined;
  cached = {
    demoMode,
    storeDomain,
    // An empty string is rejected by the client; undefined means tokenless.
    publicStorefrontToken: demoMode ? undefined : e.PUBLIC_STOREFRONT_API_TOKEN || undefined,
    storefrontId: e.PUBLIC_STOREFRONT_ID || "0",
    shopId: demoMode ? "68000000001" : shopId,
    customerAccountClientId,
    sessionSecret,
    checkoutDomain: e.PUBLIC_CHECKOUT_DOMAIN || undefined,
    customerAccountEnabled: !demoMode && Boolean(shopId && customerAccountClientId),
  };
  return cached;
}

/** Safe, non-secret runtime facts that may be serialized to the browser. */
export function getPublicRuntime() {
  const env = getEnv();
  return {
    demoMode: env.demoMode,
    storeDomain: env.storeDomain,
    isMockShop: /(^|\.)mock\.shop$/.test(env.storeDomain),
    hasStorefrontToken: Boolean(env.publicStorefrontToken),
    customerAccountEnabled: env.customerAccountEnabled,
  };
}

export type PublicRuntime = ReturnType<typeof getPublicRuntime>;
