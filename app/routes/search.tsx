import { parseCollectionParams } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontProductFilter, SearchSortKeys } from "@shopify/hydrogen/storefront-api-types";
import type { Route } from "./+types/search";
import { useViewEvent } from "~/components/analytics";
import { Browse, SEARCH_SORTS, type BrowseFilter } from "~/components/collection/browse";
import { ProductGrid } from "~/components/product/product-card";
import { SectionHeading } from "~/components/ui";
import { DISCOVERY_QUERY, SEARCH_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";
import { localList } from "~/lib/storefront/local-store";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";
import { useEffect } from "react";

const SEARCH_SORT_KEYS = new Set(["RELEVANCE", "PRICE"]);

export async function loader({ request, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const url = new URL(request.url);
  const term = (url.searchParams.get("q") ?? "").trim();
  const browse = parseCollectionParams(url.searchParams);
  const sortKey = (browse.sortKey && SEARCH_SORT_KEYS.has(browse.sortKey) ? browse.sortKey : "RELEVANCE") as SearchSortKeys;
  const dataSearch = new URLSearchParams(url.searchParams);
  dataSearch.delete("after");

  const discovery = storefront.graphql(DISCOVERY_QUERY).then((r) => r.data?.products.nodes ?? []);
  if (!term) {
    return { term, products: [], filters: [], totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, collections: [], currencyCode: "USD", dataSearch: dataSearch.toString(), discovery: await discovery };
  }
  const { data, errors } = await storefront.graphql(SEARCH_QUERY, {
    variables: {
      term,
      first: 12,
      after: url.searchParams.get("after"),
      filters: browse.filters.length ? (browse.filters as StorefrontProductFilter[]) : undefined,
      sortKey,
      reverse: sortKey === "PRICE" ? browse.reverse || undefined : undefined,
    },
  });
  if (errors) {
    console.error("[nova] search failed", errors);
    throw new Response("Search failed", { status: 500 });
  }
  const products = data!.search.nodes.filter((n): n is Extract<typeof n, { handle: string }> => "handle" in n);
  const needle = term.toLowerCase();
  return {
    term,
    products,
    filters: data!.search.productFilters as BrowseFilter[],
    totalCount: data!.search.totalCount,
    pageInfo: data!.search.pageInfo,
    collections: data!.collections.nodes.filter((c) => c.title.toLowerCase().includes(needle) || needle.includes(c.handle)),
    currencyCode: data!.localization.country.currency.isoCode,
    dataSearch: dataSearch.toString(),
    discovery: products.length ? [] : await discovery,
  };
}

export const meta: Route.MetaFunction = ({ loaderData: data }) => [
  { title: data?.term ? `“${data.term}” · Search | NOVA` : "Search | NOVA" },
  { name: "robots", content: "noindex" },
];

export default function Search({ loaderData }: Route.ComponentProps) {
  const { term, products, filters, totalCount, pageInfo, collections, currencyCode, dataSearch, discovery } = loaderData;
  const localize = useLocalizedPath();
  useViewEvent(() => getAnalytics()?.publish(AnalyticsEvent.SEARCH_VIEWED, { searchTerm: term, searchResults: { totalCount } }), term || null);
  useEffect(() => {
    if (term && totalCount) localList.pushFront("recentSearches", term);
  }, [term, totalCount]);

  return (
    <section className="container-nova pt-10">
      <form role="search" method="get" action={localize("/search")} className="mb-10 flex items-end gap-4 border-b border-ink pb-3">
        <label htmlFor="search-q" className="sr-only">Search</label>
        <input key={term} id="search-q" name="q" defaultValue={term} placeholder="Search NOVA" className="min-w-0 flex-1 bg-transparent text-4xl font-medium tracking-tight outline-none placeholder:text-stone/60 md:text-6xl" />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {!term ? (
        <>
          <p className="mb-12 text-lg text-graphite">Search headphones, walnut, lamps, cables, or anything else we make.</p>
          <SectionHeading eyebrow="Popular right now" title="Start" accent="here." />
          <ProductGrid products={discovery} />
        </>
      ) : (
        <>
          <h1 className="mb-8 text-[0.9375rem] text-graphite">
            {totalCount} {totalCount === 1 ? "result" : "results"} for <span className="font-medium text-ink">“{term}”</span>
          </h1>
          {collections.length ? (
            <ul className="mb-10 flex flex-wrap gap-2" aria-label="Matching collections">
              {collections.map((c) => <li key={c.id}><Link to={`/collections/${c.handle}`} className="chip">Collection · {c.title}</Link></li>)}
            </ul>
          ) : null}
          <Browse
            handle={`search:${term}`}
            dataSearch={dataSearch}
            action={localize("/search")}
            products={products}
            filters={filters}
            currencyCode={currencyCode}
            sorts={SEARCH_SORTS}
            pageInfo={pageInfo}
            totalLabel={`${totalCount} products`}
            hiddenFields={{ q: term }}
            empty={
              <div className="space-y-12">
                <div className="border-y border-line py-14">
                  <p className="display text-3xl">Nothing matched <span className="serif-accent">“{term}”.</span></p>
                  <p className="mt-3 max-w-md text-graphite">Check the spelling, try a more general word, or start from one of our best sellers below.</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {["headphones", "lamp", "walnut", "cable"].map((q) => <li key={q}><Link to={`/search?q=${q}`} className="chip">{q}</Link></li>)}
                  </ul>
                </div>
                {discovery.length ? (
                  <>
                    <SectionHeading eyebrow="You might like" title="Our" accent="best sellers." />
                    <ProductGrid products={discovery} />
                  </>
                ) : null}
              </div>
            }
          />
        </>
      )}
    </section>
  );
}
