import { useState } from "react";
import { Icon, parseRating, Price, RatingSummary, ShopImage } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import { localList, useLocalList } from "~/lib/storefront/local-store";
import { Link } from "~/lib/storefront/locale";
import { useQuickAdd } from "~/lib/storefront/quick-add";
import { openQuickView } from "./quick-view";

const isNew = (tags: readonly string[]) => tags.includes("new");

export function ProductCard({ product, priority = false, sizes }: { product: ProductCardData; priority?: boolean; sizes?: string }) {
  const variant = product.selectedOrFirstAvailableVariant;
  const singleVariant = (product.variantsCount?.count ?? 1) <= 1;
  const rating = parseRating(product.rating, product.ratingCount);
  const second = product.images.nodes[1];
  const wishlist = useLocalList("wishlist");
  const compare = useLocalList("compare");
  const inWishlist = wishlist.includes(product.handle);
  const inCompare = compare.includes(product.handle);
  const { add, busy } = useQuickAdd();
  const [hovered, setHovered] = useState(false);
  const swatches = product.options.find((o) => o.optionValues.some((v) => v.swatch?.color))?.optionValues ?? [];
  const onSale = variant?.compareAtPrice && Number(variant.compareAtPrice.amount) > Number(variant.price.amount);
  const discountPct = onSale ? Math.round((1 - Number(variant!.price.amount) / Number(variant!.compareAtPrice!.amount)) * 100) : 0;

  return (
    <article className="group relative flex flex-col" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <div className="relative overflow-hidden bg-bone">
        <Link to={`/products/${product.handle}`} prefetch="intent" aria-label={product.title} className="block">
          <ShopImage image={product.featuredImage} alt={product.featuredImage?.altText ?? product.title} loading={priority ? "eager" : "lazy"} sizes={sizes} className="transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
          {second ? (
            <div className={`absolute inset-0 transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
              <ShopImage image={second} alt="" sizes={sizes} />
            </div>
          ) : null}
        </Link>

        <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {!product.availableForSale ? <span className="badge badge-ink">Sold out</span> : null}
          {product.availableForSale && onSale ? <span className="badge badge-ember">−{discountPct}%</span> : null}
          {isNew(product.tags) ? <span className="badge badge-neutral">New</span> : null}
        </div>

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => localList.toggle("wishlist", product.handle)}
            aria-pressed={inWishlist}
            aria-label={inWishlist ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
            className="grid size-9 place-items-center rounded-full bg-paper/80 backdrop-blur transition hover:bg-paper"
          >
            <Icon name="heart" size={17} fill={inWishlist ? "currentColor" : "none"} className={inWishlist ? "text-ember" : ""} />
          </button>
          <button
            type="button"
            onClick={() => localList.toggle("compare", product.handle)}
            aria-pressed={inCompare}
            aria-label={inCompare ? `Remove ${product.title} from comparison` : `Compare ${product.title}`}
            className={`grid size-9 place-items-center rounded-full backdrop-blur transition md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${inCompare ? "bg-ink text-paper md:opacity-100" : "bg-paper/80 hover:bg-paper"}`}
          >
            <Icon name="compare" size={16} />
          </button>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex gap-2 transition duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-within:translate-y-0 md:focus-within:opacity-100">
          {product.availableForSale && variant ? (
            singleVariant ? (
              <button
                type="button"
                className="btn btn-light btn-sm flex-1 shadow-sm"
                disabled={busy}
                onClick={() =>
                  add({ ...variant, image: product.featuredImage, product: { title: product.title, handle: product.handle } })
                }
              >
                {busy ? "Adding…" : "Quick add"}
              </button>
            ) : (
              <button type="button" className="btn btn-light btn-sm flex-1 shadow-sm" onClick={() => openQuickView(product.handle)}>
                Choose options
              </button>
            )
          ) : null}
          <button type="button" onClick={() => openQuickView(product.handle)} aria-label={`Quick view ${product.title}`} className="btn btn-light btn-sm btn-icon shadow-sm">
            <Icon name="eye" size={17} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3.5">
        <p className="text-micro uppercase tracking-[0.14em] text-stone">{product.productType}</p>
        <h3 className="text-[0.9375rem] leading-snug font-medium">
          <Link to={`/products/${product.handle}`} className="link-underline">{product.title}</Link>
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <Price
            price={variant?.price ?? product.priceRange.minVariantPrice}
            compareAt={variant?.compareAtPrice}
            from={product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount}
          />
          <RatingSummary rating={rating} compact />
        </div>
        {swatches.length > 1 ? (
          <ul className="mt-1 flex gap-1.5" aria-label={`${swatches.length} colours`}>
            {swatches.slice(0, 5).map((s) => (
              <li key={s.name} title={s.name} className="size-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: s.swatch?.color ?? undefined }}>
                <span className="sr-only">{s.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({ products, pending = false, priorityCount = 0 }: { products: ProductCardData[]; pending?: boolean; priorityCount?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="rail -mx-gutter px-gutter">
      {products.map((p) => (
        <div key={p.id} className="w-[68vw] shrink-0 sm:w-[40vw] md:w-[28vw] lg:w-[22vw] xl:w-[18rem]">
          <ProductCard product={p} sizes="(min-width: 1024px) 22vw, 68vw" />
        </div>
      ))}
    </div>
  );
}
