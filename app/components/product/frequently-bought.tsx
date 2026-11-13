/**
 * Frequently bought together (CUSTOM). Pairs come from Storefront API
 * `productRecommendations(intent: COMPLEMENTARY)`. "Add all" sends every line in
 * one Standard Actions `updateCart` call (only additions batch, per the
 * hydrogen-cart-ui code-driven change rules). No bundle total is computed in the
 * browser; the cart returns the real totals (including automatic discounts).
 */
import { useState } from "react";
import { Icon, Price, ShopImage } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import type { ProductData } from "~/lib/queries/product.server";
import { openCartDrawer } from "~/lib/storefront/cart-drawer";
import { useCart } from "~/lib/storefront/cart";
import { Link } from "~/lib/storefront/locale";
import { useProduct } from "~/lib/storefront/product";

export function FrequentlyBoughtTogether({ product, complements }: { product: ProductData; complements: ProductCardData[] }) {
  const { selectedVariant } = useProduct();
  const loading = useCart((s) => s.loading);
  const items = complements.filter((c) => c.availableForSale && c.selectedOrFirstAvailableVariant).slice(0, 2);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!items.length || !selectedVariant?.availableForSale) return null;

  const chosen = items.filter((i) => checked.has(i.id));

  async function addAll() {
    const actions = window.Shopify?.actions;
    if (!actions || actions.updateCart.isDefault() || loading) return;
    setBusy(true);
    setMessage(null);
    openCartDrawer();
    try {
      const lines = [selectedVariant!, ...chosen.map((c) => c.selectedOrFirstAvailableVariant!)].map((v) => ({ merchandiseId: v.id, quantity: 1 }));
      const result = await actions.updateCart({ lines });
      const problem = result.userErrors?.[0]?.message ?? result.warnings?.[0]?.message;
      if (problem) setMessage(problem);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add items");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-line pt-10" aria-label="Frequently bought together">
      <p className="eyebrow mb-2">Complete the set</p>
      <h2 className="display mb-8 text-3xl">Frequently bought <span className="serif-accent">together.</span></h2>
      <div className="grid gap-8 md:grid-cols-[1fr_18rem] md:items-center">
        <ul className="flex flex-wrap items-center gap-3">
          <li className="w-28">
            <div className="bg-bone"><ShopImage image={selectedVariant.image} aspect={4 / 5} widths={[224]} sizes="7rem" alt={product.title} /></div>
            <p className="mt-2 text-[0.8125rem] font-medium">This item</p>
          </li>
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <Icon name="plus" size={16} className="text-stone" />
              <label className={`w-28 cursor-pointer ${checked.has(item.id) ? "" : "opacity-40"}`}>
                <div className="relative bg-bone">
                  <ShopImage image={item.featuredImage} aspect={4 / 5} widths={[224]} sizes="7rem" alt="" />
                  <input
                    type="checkbox"
                    className="checkbox absolute top-2 left-2"
                    checked={checked.has(item.id)}
                    onChange={() => setChecked((s) => {
                      const next = new Set(s);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })}
                    aria-label={`Include ${item.title}`}
                  />
                </div>
                <p className="mt-2 truncate text-[0.8125rem] font-medium">{item.title}</p>
                <p className="text-[0.75rem] text-graphite"><Price price={item.selectedOrFirstAvailableVariant!.price} /></p>
              </label>
              <Link to={`/products/${item.handle}`} className="sr-only">View {item.title}</Link>
            </li>
          ))}
        </ul>
        <div className="space-y-3 bg-bone p-5">
          <p className="text-sm text-graphite">{chosen.length + 1} items selected. Totals are calculated in your bag.</p>
          <button type="button" className="btn btn-primary w-full" onClick={addAll} disabled={busy || loading}>
            {busy ? "Adding…" : `Add ${chosen.length + 1} to bag`}
          </button>
          {message ? <p role="alert" className="text-[0.75rem] text-danger">{message}</p> : null}
          <p className="text-[0.75rem] text-stone">Studio and listening bundles get an automatic 10% off in your bag.</p>
        </div>
      </div>
    </section>
  );
}
