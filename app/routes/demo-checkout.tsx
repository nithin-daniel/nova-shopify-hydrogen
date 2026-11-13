/**
 * Checkout redirect DEMONSTRATION. In demo mode the mock cart's `checkoutUrl`
 * points here; `/checkout` (handled by Hydrogen's handleShopifyRoutes) and the
 * Shop Pay button redirect to it exactly as they would to Shopify Checkout on a
 * real store. No payment is taken.
 */
import { Fragment } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/demo-checkout";
import { demoCheckoutSummary } from "~/lib/mock-api/storefront/cart.server";
import { getEnv } from "~/lib/shopify/env.server";
import { Link } from "~/lib/storefront/locale";

export async function loader({ request }: Route.LoaderArgs) {
  if (!getEnv().demoMode) throw redirect("/cart");
  const url = new URL(request.url);
  const token = url.searchParams.get("cart") ?? "";
  const summary = demoCheckoutSummary(token);
  const money = (minor: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  if (!summary) return { found: false as const, params: Object.fromEntries(url.searchParams) };
  const { priced, market } = summary;
  return {
    found: true as const,
    params: Object.fromEntries(url.searchParams),
    currency: market.currencyCode,
    lines: priced.lines.map((l, i) => ({ title: l.product.title, variant: Object.values(l.variant.options).join(" / "), qty: l.stored.quantity, total: money(priced.lineTotals[i], market.currencyCode) })),
    subtotal: money(priced.subtotal, market.currencyCode),
    discount: priced.orderDiscount ? money(priced.orderDiscount, market.currencyCode) : null,
    total: money(priced.total, market.currencyCode),
    due: money(priced.checkoutCharge, market.currencyCode),
  };
}

export const meta: Route.MetaFunction = () => [{ title: "Checkout (demo) | NOVA" }, { name: "robots", content: "noindex" }];

export default function DemoCheckout({ loaderData: d }: Route.ComponentProps) {
  return (
    <section className="container-nova grid gap-12 pt-12 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <span className="badge badge-amber mb-6">Simulated checkout</span>
        <h1 className="display text-display-sm">This is where <span className="serif-accent">Shopify Checkout</span> takes over.</h1>
        <div className="prose-nova mt-6 text-[0.9375rem]">
          <p>You arrived here through the real Hydrogen flow: the checkout button links to <code>/checkout</code>, <code>handleShopifyRoutes</code> loads the cart from the cart cookie and redirects to <code>cart.checkoutUrl</code>. The Shop Pay button adds <code>payment=shop_pay</code>.</p>
          <p>On a real store that URL is Shopify's hosted checkout (shipping, tax, payment, Shop Pay). Demo mode has no store, so the mock cart's <code>checkoutUrl</code> points to this page instead. No order is created and no payment is taken.</p>
        </div>
        <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-y-1 text-[0.8125rem]">
          {Object.entries(d.params).map(([k, v]) => (
            <Fragment key={k}><dt className="font-mono text-stone">{k}</dt><dd className="font-mono break-all">{v}</dd></Fragment>
          ))}
        </dl>
        <div className="mt-8 flex gap-3">
          <Link to="/cart" className="btn btn-secondary">Back to bag</Link>
          <Link to="/lab/request-handlers" className="btn btn-ghost">How it works</Link>
        </div>
      </div>
      <aside className="bg-bone p-6 md:p-8 lg:col-span-5 lg:col-start-8">
        <h2 className="mb-5 text-lg font-medium">Order summary</h2>
        {d.found ? (
          <>
            <ul className="divide-y divide-line text-sm">
              {d.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4 py-3"><span>{l.qty}× {l.title} <span className="text-stone">{l.variant}</span></span><span className="tabular-nums">{l.total}</span></li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{d.subtotal}</dd></div>
              {d.discount ? <div className="flex justify-between text-ember"><dt>Order discount</dt><dd>−{d.discount}</dd></div> : null}
              <div className="flex justify-between text-stone"><dt>Shipping &amp; tax</dt><dd>Calculated by Shopify Checkout</dd></div>
              <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd>{d.total}</dd></div>
              {d.due !== d.total ? <div className="flex justify-between text-stone"><dt>Due after gift cards</dt><dd>{d.due}</dd></div> : null}
            </dl>
          </>
        ) : (
          <p className="text-sm text-graphite">Cart not found. It may have expired when the dev server restarted.</p>
        )}
      </aside>
    </section>
  );
}
