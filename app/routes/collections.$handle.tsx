import { parseCollectionParams } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontProductFilter } from "@shopify/hydrogen/storefront-api-types";
import type { Route } from "./+types/collections.$handle";
import { useViewEvent } from "~/components/analytics";
import { Browse, COLLECTION_SORTS, type BrowseFilter } from "~/components/collection/browse";
import { EmptyState, ShopImage } from "~/components/ui";
import { COLLECTION_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";

const PAGE_SIZE = 12;

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);
  const { data, errors } = await storefront.graphql(COLLECTION_QUERY, {
    variables: {
      handle: params.handle,
      first: PAGE_SIZE,
      after: url.searchParams.get("after"),
      filters: browse.filters.length ? (browse.filters as StorefrontProductFilter[]) : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });
  if (errors) {
    console.error("[nova] collection query failed", errors);
    throw new Response("Collection query failed", { status: 500 });
  }
  if (!data?.collection) throw new Response("Collection not found", { status: 404 });
  const dataSearch = new URLSearchParams(url.searchParams);
  dataSearch.delete("after");
  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    pageInfo: data.collection.products.pageInfo,
    filters: data.collection.products.filters as BrowseFilter[],
    currencyCode: data.localization.country.currency.isoCode,
    dataSearch: dataSearch.toString(),
    canonical: `${url.origin}${url.pathname}`,
  };
}

export const meta: Route.MetaFunction = ({ loaderData: data }) => {
  if (!data) return [{ title: "Collection not found | NOVA" }];
  const c = data.collection;
  return [
    { title: `${c.seo.title ?? c.title} | NOVA` },
    { name: "description", content: c.seo.description ?? c.description },
    { tagName: "link", rel: "canonical", href: data.canonical },
    { property: "og:title", content: c.title },
    ...(c.image ? [{ property: "og:image", content: c.image.url }] : []),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: c.title,
        description: c.description,
        url: data.canonical,
      },
    },
  ];
};

export default function CollectionRoute({ loaderData, params }: Route.ComponentProps) {
  const { collection, products, filters, currencyCode, pageInfo, dataSearch } = loaderData;
  const localize = useLocalizedPath();
  useViewEvent(() => getAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, { collection: { id: collection.id, handle: collection.handle } }), collection.handle);

  return (
    <>
      <section className="container-nova grid gap-8 pt-8 pb-12 md:grid-cols-12 md:items-end md:pt-12">
        <div className="md:col-span-6">
          <nav aria-label="Breadcrumb" className="mb-6 text-[0.8125rem] text-stone">
            <Link to="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span> <Link to="/collections" className="hover:text-ink">Collections</Link>
          </nav>
          <p className="eyebrow mb-4">{collection.kicker?.value ?? "Collection"}</p>
          <h1 className="display text-display">{collection.title}</h1>
          <div className="prose-nova mt-6 text-lg" dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }} />
        </div>
        {collection.image ? (
          <div className="overflow-hidden bg-bone md:col-span-5 md:col-start-8">
            <ShopImage image={collection.image} aspect={16 / 10} loading="eager" widths={[640, 768]} sizes="(min-width: 768px) 40vw, 100vw" alt={collection.image.altText ?? collection.title} />
          </div>
        ) : null}
      </section>
      <section className="container-nova">
        <Browse
          handle={collection.handle}
          dataSearch={dataSearch}
          action={localize(`/collections/${params.handle}`)}
          products={products}
          filters={filters}
          currencyCode={currencyCode}
          sorts={COLLECTION_SORTS}
          pageInfo={pageInfo}
          totalLabel={`${products.length}${pageInfo.hasNextPage ? "+" : ""} products`}
          empty={
            <EmptyState title="No products match those filters." body="Try removing a filter or widening the price range.">
              <a href={localize(`/collections/${params.handle}`)} className="btn btn-secondary btn-sm">Clear all filters</a>
            </EmptyState>
          }
        />
      </section>
    </>
  );
}
