/** Product comparison (CUSTOM): up to 4 products side by side, data from the Storefront API. */
import type { Route } from "./+types/compare";
import { useProductCards } from "~/components/product/recently-viewed";
import { openQuickView } from "~/components/product/quick-view";
import { EmptyState, Icon, parseRating, Price, RatingSummary, ShopImage } from "~/components/ui";
import { localList, useLocalList } from "~/lib/storefront/local-store";
import { Link } from "~/lib/storefront/locale";

export const meta: Route.MetaFunction = () => [{ title: "Compare | NOVA" }, { name: "robots", content: "noindex" }];

export default function Compare() {
  const handles = useLocalList("compare");
  const { products } = useProductCards(handles);
  const rows: { label: string; render: (p: (typeof products)[number]) => React.ReactNode }[] = [
    { label: "Price", render: (p) => <Price price={p.selectedOrFirstAvailableVariant?.price ?? p.priceRange.minVariantPrice} compareAt={p.selectedOrFirstAvailableVariant?.compareAtPrice} from={p.priceRange.minVariantPrice.amount !== p.priceRange.maxVariantPrice.amount} /> },
    { label: "Rating", render: (p) => (parseRating(p.rating, p.ratingCount) ? <RatingSummary rating={parseRating(p.rating, p.ratingCount)} /> : "–") },
    { label: "Category", render: (p) => p.productType },
    { label: "Availability", render: (p) => (p.availableForSale ? <span className="text-moss">In stock</span> : <span className="text-stone">Sold out</span>) },
    { label: "Options", render: (p) => p.options.filter((o) => o.optionValues.length > 1).map((o) => `${o.optionValues.length} ${o.name.toLowerCase()}s`).join(", ") || "One option" },
    { label: "Variants", render: (p) => p.variantsCount?.count ?? 1 },
  ];
  return (
    <section className="container-nova pt-12">
      <p className="eyebrow mb-3">Side by side</p>
      <h1 className="display mb-4 text-display">Compare</h1>
      <p className="mb-10 max-w-xl text-sm text-stone">Custom storefront feature. Add up to four products from any product card (the compare icon). Saved in this browser.</p>
      {!handles.length ? (
        <EmptyState title="Nothing to compare yet." body="Use the compare icon on product cards to add up to four products.">
          <Link to="/collections/sound" className="btn btn-primary">Compare headphones &amp; speakers</Link>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-32 pb-6 align-bottom"><span className="sr-only">Attribute</span></th>
                {products.map((p) => (
                  <th key={p.id} scope="col" className="w-1/4 px-3 pb-6 align-top font-normal">
                    <div className="relative bg-bone"><ShopImage image={p.featuredImage} aspect={4 / 5} widths={[320, 480]} sizes="20vw" alt="" /></div>
                    <Link to={`/products/${p.handle}`} className="mt-3 block font-medium hover:underline">{p.title}</Link>
                    <div className="mt-2 flex gap-3">
                      <button type="button" className="text-[0.8125rem] underline underline-offset-4" onClick={() => openQuickView(p.handle)}>Quick view</button>
                      <button type="button" className="inline-flex items-center gap-1 text-[0.8125rem] text-stone hover:text-ink" onClick={() => localList.remove("compare", p.handle)} aria-label={`Remove ${p.title} from comparison`}><Icon name="close" size={13} /> Remove</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <th scope="row" className="py-4 pr-4 font-medium text-graphite">{row.label}</th>
                  {products.map((p) => <td key={p.id} className="px-3 py-4">{row.render(p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
