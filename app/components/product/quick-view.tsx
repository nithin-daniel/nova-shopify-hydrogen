/**
 * Quick product preview (CUSTOM feature). One <dialog> in the root layout;
 * product cards open it with `openQuickView(handle)`. Data comes from the
 * `/quick-view` resource route (same PRODUCT_QUERY as the PDP), and the form is
 * the same Hydrogen product form, without URL sync.
 */
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Icon, parseRating, RatingSummary, ShopImage } from "~/components/ui";
import type { ProductData } from "~/lib/queries/product.server";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";
import { useProduct } from "~/lib/storefront/product";
import { ProductFormProvider, ProductPrice, PurchasePanel } from "./product-form";

const EVENT = "nova:quick-view";
const DIALOG_ID = "quick-view";

export function openQuickView(handle: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: handle }));
}

export function QuickView() {
  const ref = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher<{ product: ProductData | null }>();
  const [handle, setHandle] = useState<string | null>(null);
  const localize = useLocalizedPath();
  const { load } = fetcher;

  useEffect(() => {
    const onOpen = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      setHandle(next);
      void load(localize(`/quick-view?handle=${encodeURIComponent(next)}`));
      ref.current?.showModal();
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, [load, localize]);

  const product = fetcher.data?.product && fetcher.data.product.handle === handle ? fetcher.data.product : null;
  const close = () => ref.current?.close();

  return (
    <dialog ref={ref} id={DIALOG_ID} className="modal" aria-label="Quick view" {...{ closedby: "any" }}>
      <button type="button" onClick={close} aria-label="Close quick view" className="btn btn-light btn-icon absolute top-3 right-3 z-10">
        <Icon name="close" />
      </button>
      {!product ? (
        <div className="grid min-h-[28rem] place-items-center" role="status">
          <span className="text-sm text-stone">{fetcher.state === "idle" && handle ? "Product unavailable." : "Loading…"}</span>
        </div>
      ) : (
        <ProductFormProvider key={product.id} product={product} syncUrl={false}>
          <div className="grid max-h-[inherit] overflow-y-auto md:grid-cols-2">
            <QuickViewImage product={product} />
            <div className="space-y-6 p-6 md:p-10">
              <div className="space-y-2">
                <p className="eyebrow">{product.productType}</p>
                <h2 className="display text-3xl">{product.title}</h2>
                <RatingSummary rating={parseRating(product.rating, product.ratingCount)} />
              </div>
              <ProductPrice product={product} />
              <p className="text-[0.9375rem] leading-relaxed text-graphite">{product.description.slice(0, 220)}…</p>
              <PurchasePanel product={product} linkMode={false} />
              <Link to={`/products/${product.handle}`} onClick={close} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                View full details <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>
        </ProductFormProvider>
      )}
    </dialog>
  );
}

function QuickViewImage({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const image = selectedVariant?.image ?? product.media.nodes[0]?.previewImage;
  return (
    <div className="bg-bone">
      <ShopImage image={image} aspect={4 / 5} widths={[480, 768]} sizes="(min-width: 768px) 32rem, 100vw" alt={image?.altText ?? product.title} />
    </div>
  );
}
