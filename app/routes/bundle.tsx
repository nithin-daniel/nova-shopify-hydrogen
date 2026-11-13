/**
 * Bundle builder (CUSTOM). Pick one product per step; the whole bundle is added
 * with a single Standard Actions `updateCart` call. Studio and listening
 * bundles trigger the store's automatic discount, which the cart (not the
 * browser) calculates.
 */
import { useState } from "react";
import type { Route } from "./+types/bundle";
import { Icon, Price, ShopImage } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";
import { openCartDrawer } from "~/lib/storefront/cart-drawer";
import { useCart } from "~/lib/storefront/cart";
import { BUNDLE_QUERY } from "~/lib/queries/bundle.server";

export async function loader({ context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(BUNDLE_QUERY);
  if (errors) throw new Response("Bundle query failed", { status: 500 });
  const pick = (c: { products: { nodes: ProductCardData[] } } | null | undefined) => (c?.products.nodes ?? []).filter((p) => p.availableForSale);
  return {
    steps: [
      { key: "listen", title: "Listen", hint: "Choose your headphones", products: pick(data?.listen) },
      { key: "work", title: "Work", hint: "Set up the desk", products: pick(data?.work) },
      { key: "light", title: "Light", hint: "Light it well", products: pick(data?.light) },
    ],
  };
}

export const meta: Route.MetaFunction = () => [{ title: "Build your setup | NOVA" }];

export default function Bundle({ loaderData }: Route.ComponentProps) {
  const { steps } = loaderData;
  const [picks, setPicks] = useState<Record<string, ProductCardData | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const loading = useCart((s) => s.loading);
  const chosen = steps.map((s) => picks[s.key]).filter((p): p is ProductCardData => Boolean(p));

  async function addBundle() {
    const actions = window.Shopify?.actions;
    if (!actions || actions.updateCart.isDefault() || loading || !chosen.length) return;
    setBusy(true);
    setMessage(null);
    openCartDrawer();
    try {
      const result = await actions.updateCart({
        lines: chosen.map((p) => ({ merchandiseId: p.selectedOrFirstAvailableVariant!.id, quantity: 1, attributes: [{ key: "_bundle", value: "Build your setup" }] })),
      });
      const problem = result.userErrors?.[0]?.message ?? result.warnings?.[0]?.message;
      if (problem) setMessage(problem);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add bundle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-nova pt-12">
      <p className="eyebrow mb-3">Bundle builder</p>
      <h1 className="display mb-4 max-w-3xl text-display">Build your <span className="serif-accent">setup.</span></h1>
      <p className="mb-14 max-w-xl text-graphite">Three steps to a calmer workspace. Pick one piece per step and add the set in one go. Your bag shows the real total, including any automatic bundle savings.</p>
      <div className="grid gap-12 lg:grid-cols-12">
        <ol className="space-y-14 lg:col-span-8">
          {steps.map((step, i) => (
            <li key={step.key}>
              <h2 className="mb-5 flex items-baseline gap-3 text-xl font-medium">
                <span className="grid size-8 place-items-center rounded-full border border-ink text-sm tabular-nums">{i + 1}</span>
                {step.title} <span className="text-sm font-normal text-stone">{step.hint}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" role="radiogroup" aria-label={step.title}>
                {step.products.slice(0, 8).map((p) => {
                  const selected = picks[step.key]?.id === p.id;
                  return (
                    <li key={p.id}>
                      <button type="button" role="radio" aria-checked={selected} onClick={() => setPicks((s) => ({ ...s, [step.key]: selected ? undefined : p }))} className={`block w-full text-left transition ${selected ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "opacity-90 hover:opacity-100"}`}>
                        <div className="relative bg-bone">
                          <ShopImage image={p.featuredImage} aspect={4 / 5} widths={[240, 360]} sizes="(min-width: 768px) 14vw, 45vw" alt="" />
                          {selected ? <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-ink text-paper"><Icon name="check" size={15} /></span> : null}
                        </div>
                        <p className="mt-2 text-[0.8125rem] font-medium">{p.title}</p>
                        <p className="text-[0.75rem] text-graphite"><Price price={p.selectedOrFirstAvailableVariant?.price} /></p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
        <aside className="lg:col-span-4" aria-label="Your bundle">
          <div className="space-y-5 bg-bone p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-medium">Your setup</h2>
            <ul className="space-y-3">
              {steps.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone">{s.title}</span>
                  {picks[s.key] ? <span className="text-right">{picks[s.key]!.title} · <Price price={picks[s.key]!.selectedOrFirstAvailableVariant?.price} /></span> : <span className="text-stone">Not chosen</span>}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary w-full" disabled={!chosen.length || busy || loading} onClick={addBundle}>
              {busy ? "Adding…" : `Add ${chosen.length || ""} ${chosen.length === 1 ? "piece" : "pieces"} to bag`}
            </button>
            {message ? <p role="alert" className="text-[0.8125rem] text-danger">{message}</p> : null}
            <p className="text-[0.75rem] text-stone">Lines carry a private <code className="code-inline">_bundle</code> line attribute, hidden in the cart UI, available to checkout and order processing.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
