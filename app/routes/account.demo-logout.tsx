import { redirect } from "react-router";
import type { Route } from "./+types/account.demo-logout";
import { DEMO_CUSTOMER_KEY } from "~/lib/shopify/customer.server";
import { shopifyContext } from "~/lib/shopify/context";

/** Demo sign-out (same-origin POST only). Live mode posts to Hydrogen's /account/logout. */
export async function action({ request, context }: Route.ActionArgs) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Response("Forbidden", { status: 403 });
  context.get(shopifyContext).session.removeSessionItem(DEMO_CUSTOMER_KEY);
  throw redirect("/");
}

export function loader() {
  throw redirect("/account");
}
