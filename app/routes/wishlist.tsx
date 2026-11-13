/** Wishlist (CUSTOM): handles in localStorage; cards fetched live from the Storefront API. */
import type { Route } from "./+types/wishlist";
import { ProductGrid } from "~/components/product/product-card";
import { useProductCards } from "~/components/product/recently-viewed";
import { EmptyState } from "~/components/ui";
import { localList, useLocalList } from "~/lib/storefront/local-store";
import { Link } from "~/lib/storefront/locale";

export const meta: Route.MetaFunction = () => [{ title: "Wishlist | NOVA" }, { name: "robots", content: "noindex" }];

export default function Wishlist() {
  const handles = useLocalList("wishlist");
  const { products, loading } = useProductCards(handles);
  return (
    <section className="container-nova pt-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Saved for later</p>
          <h1 className="display text-display">Wishlist</h1>
        </div>
        {handles.length ? <button type="button" className="text-sm text-stone underline underline-offset-4" onClick={() => localList.clear("wishlist")}>Clear wishlist</button> : null}
      </div>
      <p className="mb-10 max-w-xl text-sm text-stone">Custom storefront feature: saved in this browser only (localStorage). Signed-in wishlists would be stored server-side, for example in customer metafields.</p>
      {!handles.length ? (
        <EmptyState title="Nothing saved yet." body="Tap the heart on any product to keep it here.">
          <Link to="/collections/best-sellers" className="btn btn-primary">Discover best sellers</Link>
        </EmptyState>
      ) : loading && !products.length ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">{handles.map((h) => <div key={h} className="skeleton aspect-[4/5]" />)}</div>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
