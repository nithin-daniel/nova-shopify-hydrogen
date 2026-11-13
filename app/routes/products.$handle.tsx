import { getSelectedProductOptions } from "@shopify/hydrogen";
import { Suspense, useEffect, useState } from "react";
import { Await } from "react-router";
import type { Route } from "./+types/products.$handle";
import { useViewEvent } from "~/components/analytics";
import { FrequentlyBoughtTogether } from "~/components/product/frequently-bought";
import { ProductRail } from "~/components/product/product-card";
import { ProductFormProvider, ProductPrice, PurchasePanel } from "~/components/product/product-form";
import { ProductGallery } from "~/components/product/product-gallery";
import { RecentlyViewed } from "~/components/product/recently-viewed";
import { Icon, parseRating, RatingSummary, SectionHeading, Stars } from "~/components/ui";
import { PRODUCT_QUERY, RECOMMENDATIONS_QUERY, type ProductData } from "~/lib/queries/product.server";
import { getReviewsProvider, type Review } from "~/lib/reviews.server";
import { shopifyContext } from "~/lib/shopify/context";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";
import { openCartDrawer } from "~/lib/storefront/cart-drawer";
import { localList } from "~/lib/storefront/local-store";
import { Link } from "~/lib/storefront/locale";
import { useProduct } from "~/lib/storefront/product";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { storefront, demoMode } = context.get(shopifyContext);
  const url = new URL(request.url);
  const selectedOptions = getSelectedProductOptions({ searchParams: url.searchParams });

  const { data, errors } = await storefront.graphql(PRODUCT_QUERY, {
    // quantityAvailable needs the inventory scope on real stores; the mock API has it.
    variables: { handle: params.handle, selectedOptions, withInventory: demoMode },
  });
  if (errors) {
    console.error("[nova] product query failed", errors);
    throw new Response("Product query failed", { status: 500 });
  }
  if (!data?.product) throw new Response("Product not found", { status: 404 });

  const reviews = await getReviewsProvider();
  return {
    product: data.product,
    policies: data.shop,
    canonical: `${url.origin}${url.pathname}`,
    // Below-the-fold data streams after the purchase UI.
    recommendations: storefront.graphql(RECOMMENDATIONS_QUERY, { variables: { handle: params.handle } }).then((r) => ({ related: r.data?.related ?? [], complementary: r.data?.complementary ?? [] })),
    reviews: reviews.forProduct(params.handle),
    reviewsSource: reviews.source,
  };
}

export const meta: Route.MetaFunction = ({ loaderData: data }) => {
  if (!data) return [{ title: "Product not found | NOVA" }];
  const p = data.product;
  const v = p.selectedOrFirstAvailableVariant;
  const rating = parseRating(p.rating, p.ratingCount);
  const image = p.media.nodes[0]?.previewImage?.url;
  return [
    { title: p.seo.title ?? `${p.title} | NOVA` },
    { name: "description", content: p.seo.description ?? p.description.slice(0, 155) },
    { tagName: "link", rel: "canonical", href: data.canonical },
    { property: "og:type", content: "product" },
    { property: "og:title", content: p.title },
    ...(image ? [{ property: "og:image", content: image }] : []),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description: p.description,
        image,
        brand: { "@type": "Brand", name: p.vendor },
        sku: v?.sku ?? undefined,
        ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.value, reviewCount: rating.count } } : {}),
        offers: v
          ? {
              "@type": "Offer",
              price: v.price.amount,
              priceCurrency: v.price.currencyCode,
              availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: data.canonical,
            }
          : undefined,
      },
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: new URL(data.canonical).origin },
          ...(p.collections.nodes[0] ? [{ "@type": "ListItem", position: 2, name: p.collections.nodes[0].title, item: `${new URL(data.canonical).origin}/collections/${p.collections.nodes[0].handle}` }] : []),
          { "@type": "ListItem", position: 3, name: p.title, item: data.canonical },
        ],
      },
    },
  ];
};

type Details = { highlights: string[]; materials: string; dimensions: string; inTheBox: string[]; care: string; warranty: string };

function parseDetails(value?: string | null): Details | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Details;
  } catch {
    return null;
  }
}

export default function ProductRoute({ loaderData }: Route.ComponentProps) {
  const { product, recommendations, reviews, policies } = loaderData;
  const rating = parseRating(product.rating, product.ratingCount);
  const details = parseDetails(product.details?.value);
  const collection = product.collections.nodes[0];

  useEffect(() => {
    localList.pushFront("recentlyViewed", product.handle);
  }, [product.handle]);

  return (
    <ProductFormProvider product={product}>
      <ProductViewed product={product} />
      <section className="container-nova pt-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-[0.8125rem] text-stone">
          <Link to="/" className="hover:text-ink">Home</Link>
          {collection ? <> <span aria-hidden="true">/</span> <Link to={`/collections/${collection.handle}`} className="hover:text-ink">{collection.title}</Link></> : null}
          <span aria-hidden="true"> / </span><span className="text-graphite">{product.title}</span>
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery product={product} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <div className="space-y-7 lg:sticky lg:top-24">
              <header className="space-y-3">
                <p className="eyebrow">{product.vendor} · {product.productType}</p>
                <h1 className="display text-display-sm">{product.title}</h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <ProductPrice product={product} />
                  {rating ? <a href="#reviews"><RatingSummary rating={rating} /></a> : null}
                </div>
              </header>
              <p className="leading-relaxed text-graphite">{product.description}</p>
              <PurchasePanel product={product} />
              <ul className="grid grid-cols-3 gap-3 border-t border-line pt-6 text-[0.75rem] text-graphite">
                <li className="flex flex-col gap-1.5"><Icon name="truck" size={18} className="text-ink" />Free shipping over $150</li>
                <li className="flex flex-col gap-1.5"><Icon name="return" size={18} className="text-ink" />30-day returns</li>
                <li className="flex flex-col gap-1.5"><Icon name="shield" size={18} className="text-ink" />{details?.warranty.replace(" NOVA limited warranty.", "") ?? "Two-year"} warranty</li>
              </ul>
              <Accordions details={details} descriptionHtml={product.descriptionHtml} policies={policies} />
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="container-nova pt-section"><div className="skeleton h-72" /></div>}>
        <Await resolve={recommendations}>
          {(recs) => (
            <>
              <div className="container-nova pt-section">
                <FrequentlyBoughtTogether product={product} complements={recs.complementary} />
              </div>
              {recs.related.length ? (
                <section className="container-nova pt-section">
                  <SectionHeading eyebrow="Recommended" title="You may" accent="also like." />
                  <ProductRail products={recs.related} />
                </section>
              ) : null}
            </>
          )}
        </Await>
      </Suspense>

      <Suspense fallback={null}>
        <Await resolve={reviews}>{(list) => <Reviews reviews={list} rating={rating} />}</Await>
      </Suspense>

      <RecentlyViewed className="container-nova pt-section" exclude={product.handle} />
      <MobileBuyBar product={product} />
    </ProductFormProvider>
  );
}

function ProductViewed({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const v = selectedVariant ?? product.selectedOrFirstAvailableVariant;
  useViewEvent(
    () =>
      getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
        products: [
          {
            id: product.id,
            title: product.title,
            price: v?.price ?? product.priceRange.minVariantPrice,
            vendor: product.vendor,
            variantId: v?.id ?? product.id,
            variantTitle: v?.title ?? product.title,
            quantity: 1,
            sku: v?.sku ?? undefined,
          },
        ],
      }),
    product.handle,
  );
  return null;
}

function Accordions({ details, descriptionHtml, policies }: { details: Details | null; descriptionHtml: string; policies: Route.ComponentProps["loaderData"]["policies"] }) {
  const items: { title: string; body: React.ReactNode; open?: boolean }[] = [
    {
      title: "Details",
      open: true,
      body: (
        <>
          <div className="prose-nova text-[0.9375rem]" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          {details?.highlights.length ? (
            <ul className="mt-4 space-y-2">{details.highlights.map((h) => <li key={h} className="flex gap-2.5"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-ember" />{h}</li>)}</ul>
          ) : null}
        </>
      ),
    },
    ...(details
      ? [
          {
            title: "Materials & dimensions",
            body: (
              <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
                <dt className="text-stone">Materials</dt><dd>{details.materials}</dd>
                <dt className="text-stone">Dimensions</dt><dd>{details.dimensions}</dd>
                <dt className="text-stone">In the box</dt><dd>{details.inTheBox.join(", ")}</dd>
                <dt className="text-stone">Care</dt><dd>{details.care}</dd>
              </dl>
            ),
          },
        ]
      : []),
    {
      title: "Shipping & returns",
      body: (
        <div className="space-y-3">
          <p>Free standard shipping over $150 in the US (3–5 business days). Express and overnight at checkout. International orders ship in 5–10 business days with duties included.</p>
          <p>Return anything within 30 days. Audio products can be returned even when opened.</p>
          <p className="flex gap-4">
            {policies.shippingPolicy ? <Link to={`/policies/${policies.shippingPolicy.handle}`} className="underline underline-offset-4">Shipping policy</Link> : null}
            {policies.refundPolicy ? <Link to={`/policies/${policies.refundPolicy.handle}`} className="underline underline-offset-4">Returns policy</Link> : null}
          </p>
        </div>
      ),
    },
    { title: "Warranty", body: <p>{details?.warranty ?? "Two-year NOVA limited warranty."} Spare parts are stocked for at least seven years after a product is discontinued.</p> },
  ];
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.title} open={item.open} className="group border-b border-line">
          <summary className="flex items-center justify-between py-4 text-[0.9375rem] font-medium">
            {item.title}
            <Icon name="plus" size={16} className="transition-transform group-open:rotate-45" />
          </summary>
          <div className="pb-5 text-[0.9375rem] leading-relaxed text-graphite">{item.body}</div>
        </details>
      ))}
    </div>
  );
}

function Reviews({ reviews, rating }: { reviews: Review[]; rating: ReturnType<typeof parseRating> }) {
  const [shown, setShown] = useState(3);
  if (!rating && !reviews.length) return null;
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
  return (
    <section id="reviews" className="container-nova scroll-mt-24 pt-section" aria-label="Reviews">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow mb-3">Reviews</p>
          {rating ? (
            <>
              <p className="display text-6xl">{rating.value.toFixed(1)}</p>
              <div className="mt-2"><Stars value={rating.value} size={16} /></div>
              <p className="mt-2 text-sm text-stone">Based on {rating.count.toLocaleString("en-US")} reviews</p>
            </>
          ) : null}
          {reviews.length ? (
            <ul className="mt-8 space-y-1.5">
              {distribution.map((d) => (
                <li key={d.n} className="flex items-center gap-3 text-[0.75rem] text-stone">
                  <span className="w-3 tabular-nums">{d.n}</span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-sand"><span className="block h-full bg-ink" style={{ width: `${(d.count / reviews.length) * 100}%` }} /></span>
                  <span className="w-4 text-right tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-6 text-[0.75rem] text-stone">Rating from the standard <code className="code-inline">reviews.rating</code> metafield; review text from the app's reviews provider.</p>
        </div>
        <div className="md:col-span-8">
          {reviews.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.slice(0, shown).map((r) => (
                <li key={r.id} className="grid gap-2 py-7 md:grid-cols-[10rem_1fr] md:gap-8">
                  <div className="text-[0.8125rem] text-stone">
                    <p className="font-medium text-ink">{r.author}</p>
                    <p>{r.location}</p>
                    {r.verifiedBuyer ? <p className="mt-1 text-moss">Verified buyer</p> : null}
                  </div>
                  <div>
                    <div className="flex items-center gap-3"><Stars value={r.rating} /><span className="text-[0.75rem] text-stone">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
                    <h3 className="mt-2 font-medium">{r.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-graphite">{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-line py-10 text-graphite">No written reviews to show yet. Connect a reviews app to display review text.</p>
          )}
          {reviews.length > shown ? (
            <button type="button" onClick={() => setShown((n) => n + 3)} className="btn btn-secondary btn-sm mt-6">Show more reviews</button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MobileBuyBar({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur transition-transform lg:hidden ${visible ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!visible}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.title}</p>
          <p className="text-[0.8125rem] text-graphite"><ProductPrice product={product} /></p>
        </div>
        <button type="button" tabIndex={visible ? 0 : -1} className="btn btn-primary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {selectedVariant?.availableForSale ? "Choose & add" : "View options"}
        </button>
        <button type="button" tabIndex={visible ? 0 : -1} className="btn btn-secondary btn-icon" onClick={openCartDrawer} aria-label="Open bag"><Icon name="bag" size={18} /></button>
      </div>
    </div>
  );
}
