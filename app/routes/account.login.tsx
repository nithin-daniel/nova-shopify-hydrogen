/**
 * Demo sign-in. In live mode Hydrogen's `/account/login` handler (registered
 * with handleShopifyRoutes) redirects to Shopify's hosted login before React
 * Router runs, so this route only renders in DEMO_MODE, or in live mode when
 * Customer Account API credentials are missing.
 */
import { Form, redirect } from "react-router";
import type { Route } from "./+types/account.login";
import { DEMO_CUSTOMERS } from "~/lib/mock-api/customer-account/index.server";
import { DEMO_CUSTOMER_KEY } from "~/lib/shopify/customer.server";
import { shopifyContext } from "~/lib/shopify/context";

const safeReturn = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/account");

export async function loader({ context, request }: Route.LoaderArgs) {
  const { demoMode, customer } = context.get(shopifyContext);
  if (demoMode && (await customer.isLoggedIn())) throw redirect(safeReturn(new URL(request.url).searchParams.get("return_to")));
  return { demoMode, customers: demoMode ? DEMO_CUSTOMERS : [], returnTo: safeReturn(new URL(request.url).searchParams.get("return_to")) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { demoMode, session } = context.get(shopifyContext);
  if (!demoMode) throw new Response("Not found", { status: 404 });
  const form = await request.formData();
  const id = String(form.get("customerId") ?? "");
  if (!DEMO_CUSTOMERS.some((c) => c.id === id)) return { error: "Choose a demo customer." };
  session.setSessionItem(DEMO_CUSTOMER_KEY, id);
  throw redirect(safeReturn(String(form.get("returnTo") ?? "")));
}

export const meta: Route.MetaFunction = () => [{ title: "Sign in | NOVA" }, { name: "robots", content: "noindex" }];

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const { demoMode, customers, returnTo } = loaderData;
  return (
    <section className="container-nova grid gap-12 pt-12 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <p className="eyebrow mb-4">Account</p>
        <h1 className="display text-display-sm">Welcome <span className="serif-accent">back.</span></h1>
        {demoMode ? (
          <div className="mt-6 space-y-3 text-graphite">
            <p>This is demo mode. Instead of Shopify's hosted login (Customer Account API OAuth), pick a fictional customer below. Their orders and addresses come from the mock Customer Account API.</p>
            <p className="text-sm text-stone">The session lives in a signed, HttpOnly cookie. Tokens never reach the browser.</p>
          </div>
        ) : (
          <p className="mt-6 text-graphite">Customer accounts aren't configured for this store. Set <code className="code-inline">SHOP_ID</code> and <code className="code-inline">PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID</code>, and serve the app over HTTPS. See docs/SHOPIFY_CONNECTION.md.</p>
        )}
      </header>
      {demoMode ? (
        <Form method="post" className="lg:col-span-7 lg:col-start-6">
          <input type="hidden" name="returnTo" value={returnTo} />
          <fieldset>
            <legend className="mb-4 text-sm font-medium">Sign in as</legend>
            <ul className="grid gap-3 sm:grid-cols-2">
              {customers.map((c, i) => (
                <li key={c.id}>
                  <label className="flex h-full cursor-pointer gap-3 border border-line p-4 transition has-[:checked]:border-ink has-[:checked]:bg-bone hover:border-ink">
                    <input type="radio" name="customerId" value={c.id} defaultChecked={i === 0} className="mt-1 accent-ink" />
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-[0.8125rem] text-stone">{c.email}</span>
                      <span className="mt-1.5 block text-[0.8125rem] text-graphite">{c.persona}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {actionData?.error ? <p role="alert" className="field-error">{actionData.error}</p> : null}
          <button type="submit" className="btn btn-primary mt-8">Continue</button>
        </Form>
      ) : null}
    </section>
  );
}
