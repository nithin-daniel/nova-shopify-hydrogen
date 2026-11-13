/**
 * Recently viewed + personalised picks (CUSTOM features).
 * Only product handles are stored, in localStorage. Cards are fetched from
 * the Storefront API through the `/product-cards` and `/recommendations`
 * resource routes, so prices stay live and market-correct.
 */
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { SectionHeading } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import { localList, useLocalList } from "~/lib/storefront/local-store";
import { useLocalizedPath } from "~/lib/storefront/locale";
import { ProductRail } from "./product-card";

export function useProductCards(handles: readonly string[]) {
  const fetcher = useFetcher<{ products: ProductCardData[] }>();
  const localize = useLocalizedPath();
  const key = handles.join(",");
  const { load } = fetcher;
  useEffect(() => {
    if (key) void load(localize(`/product-cards?handles=${encodeURIComponent(key)}`));
  }, [key, load, localize]);
  const byHandle = new Map((fetcher.data?.products ?? []).map((p) => [p.handle, p]));
  return {
    products: key ? handles.map((h) => byHandle.get(h)).filter((p): p is ProductCardData => Boolean(p)) : [],
    loading: fetcher.state !== "idle",
  };
}

export function RecentlyViewed({ className = "", exclude }: { className?: string; exclude?: string }) {
  const handles = useLocalList("recentlyViewed").filter((h) => h !== exclude);
  const { products } = useProductCards(handles.slice(0, 8));
  if (!products.length) return null;
  return (
    <section className={className} aria-label="Recently viewed">
      <SectionHeading
        eyebrow="Recently viewed"
        title="Pick up where"
        accent="you left off."
        action={
          <button type="button" className="text-sm text-stone underline underline-offset-4" onClick={() => localList.clear("recentlyViewed")}>
            Clear history
          </button>
        }
      />
      <ProductRail products={products} />
    </section>
  );
}

export function PersonalisedPicks({ className = "" }: { className?: string }) {
  const viewed = useLocalList("recentlyViewed");
  const seed = viewed[0];
  const fetcher = useFetcher<{ products: ProductCardData[] }>();
  const localize = useLocalizedPath();
  const { load } = fetcher;
  useEffect(() => {
    if (seed) void load(localize(`/recommendations?handle=${encodeURIComponent(seed)}&intent=RELATED`));
  }, [seed, load, localize]);
  const products = (fetcher.data?.products ?? []).filter((p) => !viewed.slice(0, 3).includes(p.handle));
  if (!seed || products.length < 2) return null;
  return (
    <section className={className} aria-label="Picked for you">
      <SectionHeading eyebrow="Picked for you · based on your browsing" title="You might" accent="also like." />
      <ProductRail products={products} />
    </section>
  );
}
