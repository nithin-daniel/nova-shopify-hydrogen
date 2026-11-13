import { redirect, type RouterContextProvider } from "react-router";
import { shopifyContext } from "~/lib/shopify/context";

/**
 * Returns a Customer Account API client bound to the signed-in customer, or
 * redirects. Follows the hydrogen-customer-account refresh rule: if the session
 * is refreshable but has no usable access token, redirect once to
 * /account/refresh with a one-shot guard (`refreshed=1`).
 */
export async function requireCustomer(context: Readonly<RouterContextProvider>, request: Request) {
  const { customer } = context.get(shopifyContext);
  const url = new URL(request.url);
  const session = await customer.getClient();
  if (session) return session;
  if (customer.mode === "live" && (await customer.needsRefresh()) && !url.searchParams.has("refreshed")) {
    const back = new URL(url);
    back.searchParams.set("refreshed", "1");
    throw redirect(`/account/refresh?return_to=${encodeURIComponent(back.pathname + back.search)}`);
  }
  throw redirect(`/account/login?return_to=${encodeURIComponent(url.pathname)}`);
}

