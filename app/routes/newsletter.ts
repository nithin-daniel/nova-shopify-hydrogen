/**
 * Newsletter signup (CUSTOM). Shopify's Storefront API has no newsletter
 * mutation for headless stores; real stores post to the Customer Account API
 * (`customerEmailMarketingSubscribe` when signed in) or an ESP such as Klaviyo.
 * This demo validates the address and acknowledges it without storing it.
 */
import { data } from "react-router";
import type { Route } from "./+types/newsletter";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return data({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }
  return { ok: true, message: `Thanks, ${email} is on the list (demo: nothing was stored).` };
}

export function loader() {
  throw new Response("Not found", { status: 404 });
}
