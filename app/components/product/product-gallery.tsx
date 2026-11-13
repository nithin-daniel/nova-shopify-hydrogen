/** PDP gallery: jumps to the selected variant's image (variant-specific imagery). */
import { useEffect, useMemo, useRef, useState } from "react";
import { ShopImage } from "~/components/ui";
import type { ProductData } from "~/lib/queries/product.server";
import { useProduct } from "~/lib/storefront/product";

export function ProductGallery({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const images = useMemo(
    () => product.media.nodes.map((m) => ("image" in m && m.image ? m.image : m.previewImage)).filter((i): i is NonNullable<typeof i> => Boolean(i)),
    [product.media.nodes],
  );
  const variantIndex = selectedVariant?.image ? images.findIndex((i) => i.url === selectedVariant.image?.url) : -1;
  const [active, setActive] = useState(Math.max(0, variantIndex));
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variantIndex >= 0) {
      setActive(variantIndex);
      const rail = railRef.current;
      const slide = rail?.children[variantIndex] as HTMLElement | undefined;
      if (rail && slide) rail.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }, [variantIndex]);

  if (!images.length) return <div className="aspect-[4/5] bg-bone" />;

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
      <ul className="hidden max-h-[80vh] flex-col gap-3 overflow-y-auto lg:flex" aria-label="Product images">
        {images.map((img, i) => (
          <li key={img.url}>
            <button type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active ? "true" : undefined} className={`block w-full overflow-hidden bg-bone transition ${i === active ? "ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-60 hover:opacity-100"}`}>
              <ShopImage image={img} aspect={4 / 5} widths={[144]} sizes="4.5rem" alt="" />
            </button>
          </li>
        ))}
      </ul>
      {/* Desktop: one large image */}
      <div className="hidden overflow-hidden bg-bone lg:block">
        <ShopImage key={images[active]?.url} image={images[active]} aspect={4 / 5} loading="eager" widths={[640, 768]} sizes="(min-width: 1024px) 45vw, 100vw" className="animate-fade-up" />
      </div>
      {/* Mobile: swipeable rail */}
      <div ref={railRef} className="rail -mx-gutter gap-2 px-gutter lg:hidden" aria-label="Product images">
        {images.map((img, i) => (
          <div key={img.url} className="w-[86vw] shrink-0 bg-bone">
            <ShopImage image={img} aspect={4 / 5} loading={i === 0 ? "eager" : "lazy"} widths={[480, 768]} sizes="86vw" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[0.75rem] text-stone lg:hidden">{images.length} images · swipe</p>
    </div>
  );
}
