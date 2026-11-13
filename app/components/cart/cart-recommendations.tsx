/** "Pairs well with": complementary products for the first cart line (Storefront API productRecommendations). */
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { Price, ShopImage } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import { useCart } from "~/lib/storefront/cart";
import { useLocalizedPath } from "~/lib/storefront/locale";
import { useQuickAdd } from "~/lib/storefront/quick-add";
import { openQuickView } from "~/components/product/quick-view";

export function CartRecommendations({ title = "Pairs well with" }: { title?: string }) {
  const lines = useCart((s) => s.data.lines.nodes);
  const handle = lines[0]?.merchandise?.product?.handle;
  const fetcher = useFetcher<{ products: ProductCardData[] }>();
  const localize = useLocalizedPath();
  const { add, busy } = useQuickAdd();
  const { load } = fetcher;
  useEffect(() => {
    if (handle) void load(localize(`/recommendations?handle=${encodeURIComponent(handle)}&intent=COMPLEMENTARY`));
  }, [handle, load, localize]);

  const inCart = new Set(lines.map((l) => l.merchandise?.product?.handle));
  const products = (fetcher.data?.products ?? []).filter((p) => !inCart.has(p.handle) && p.availableForSale).slice(0, 3);
  if (!products.length) return null;
  return (
    <section className="border-t border-line py-6" aria-label={title}>
      <h3 className="eyebrow mb-4">{title}</h3>
      <ul className="space-y-4">
        {products.map((p) => {
          const v = p.selectedOrFirstAvailableVariant;
          const single = (p.variantsCount?.count ?? 1) <= 1;
          return (
            <li key={p.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
              <div className="bg-bone"><ShopImage image={p.featuredImage} aspect={1} widths={[112]} sizes="3.5rem" alt="" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-[0.8125rem] text-graphite"><Price price={v?.price ?? p.priceRange.minVariantPrice} /></p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => (single && v ? add({ ...v, image: p.featuredImage, product: { title: p.title, handle: p.handle } }) : openQuickView(p.handle))}
              >
                {single ? "Add" : "Options"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
