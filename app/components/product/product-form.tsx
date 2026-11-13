/**
 * Variant picker + add-to-cart (skill: hydrogen-variant-form, React Router).
 *
 * - Same-product option values are GET <Link>s (work without JS). After
 *   hydration a plain click calls the registered handler; the provider's
 *   `onSelect` owns URL sync (replace, no scroll reset).
 * - Non-existent combinations render as disabled buttons; sold-out values stay
 *   interactive with a "Sold out" treatment.
 * - Add to cart uses `formProps({ beforeSubmit: openCartDrawer })` so the drawer
 *   opens on the optimistic state.
 */
import { canAddToCart } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/react";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { Icon, Price, StockMessage } from "~/components/ui";
import type { ProductData } from "~/lib/queries/product.server";
import { openCartDrawer } from "~/lib/storefront/cart-drawer";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";
import { ProductProvider, useProduct, useProductForm, variantUrl } from "~/lib/storefront/product";
import { useQuickAdd } from "~/lib/storefront/quick-add";

export function ProductFormProvider({ product, syncUrl = true, children }: { product: ProductData; syncUrl?: boolean; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const localize = useLocalizedPath();
  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        if (!syncUrl) return;
        void navigate(localize(variantUrl(product, result.selectedOptions, result.selectedVariant?.product?.handle, new URLSearchParams(location.search))), {
          replace: true,
          preventScrollReset: true,
        });
      }}
    >
      {children}
    </ProductProvider>
  );
}

export function ProductPrice({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  return (
    <Price
      className="text-xl"
      price={selectedVariant?.price ?? product.priceRange.minVariantPrice}
      compareAt={selectedVariant?.compareAtPrice}
      from={!selectedVariant && product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount}
    />
  );
}

function OptionValues({ product, linkMode }: { product: ProductData; linkMode: boolean }) {
  const { options, register } = useProductForm();
  const location = useLocation();
  const base = useMemo(() => new URLSearchParams(location.search), [location.search]);
  if (options.every((o) => o.values.length <= 1)) return null;

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const selected = option.values.find((v) => v.selected);
        const swatchMode = option.values.some((v) => v.swatch?.color);
        return (
          <fieldset key={option.name}>
            <legend className="mb-3 flex w-full items-baseline justify-between text-sm">
              <span className="font-medium">{option.name}</span>
              <span className="text-stone">{selected?.name ?? "Select"}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const registered = register("optionValue", { optionName: option.name, value: value.name });
                const crossProduct = value.handle !== product.handle;
                const label = (
                  <>
                    {swatchMode ? (
                      <span className="size-5 rounded-full ring-1 ring-ink/15 ring-inset" style={{ backgroundColor: value.swatch?.color ?? undefined }} aria-hidden="true" />
                    ) : null}
                    <span className={swatchMode ? "sr-only" : ""}>{value.name}</span>
                    {!value.available && value.exists ? <span className="sr-only"> (Sold out)</span> : null}
                  </>
                );
                const cls = `relative inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full border text-sm transition ${
                  swatchMode ? "size-10 p-0" : "px-4"
                } ${value.selected ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink"} ${
                  !value.available ? "text-stone after:absolute after:inset-x-2 after:top-1/2 after:h-px after:-rotate-12 after:bg-stone/70" : ""
                }`;
                if (!value.exists) {
                  return (
                    <button key={value.name} type="button" disabled aria-pressed={value.selected} title={`${value.name} is not available in this combination`} className={`${cls} cursor-not-allowed opacity-30`}>
                      {label}
                    </button>
                  );
                }
                const to = variantUrl(product, value.selectedOptions, value.handle, base);
                if (!linkMode) {
                  return (
                    <button key={value.name} type="button" aria-pressed={value.selected} title={value.name} className={cls} onClick={() => registered.onClick()}>
                      {label}
                    </button>
                  );
                }
                const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
                  if (crossProduct) return;
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
                  const target = event.currentTarget.target;
                  if (target && target !== "_self") return;
                  event.preventDefault();
                  registered.onClick();
                };
                return (
                  <Link
                    key={value.name}
                    to={to}
                    replace={!crossProduct}
                    preventScrollReset
                    aria-current={value.selected ? "true" : undefined}
                    data-available={value.available ? "true" : "false"}
                    title={value.name}
                    onClick={onClick}
                    className={cls}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function PurchasePanel({ product, linkMode = true, showStock = true }: { product: ProductData; linkMode?: boolean; showStock?: boolean }) {
  const { options, selectedVariant, formProps, register, errors, pending, matchedLineItem } = useProductForm();
  const addable = canAddToCart(product, options);
  const [quantity, setQuantity] = useState(1);
  const { add, busy } = useQuickAdd();
  const engraving = product.tags.includes("walnut");
  const [engravingText, setEngravingText] = useState("");
  const qty = Math.max(1, Math.min(10, quantity));
  const quantityAvailable = selectedVariant && "quantityAvailable" in selectedVariant ? (selectedVariant.quantityAvailable as number | null | undefined) : undefined;

  async function buyNow() {
    if (!selectedVariant) return;
    await add({ ...selectedVariant, product: { title: product.title, handle: product.handle } }, qty);
    window.location.assign("/checkout");
  }

  return (
    <div className="space-y-7">
      <OptionValues product={product} linkMode={linkMode} />

      {showStock && selectedVariant ? <StockMessage available={selectedVariant.availableForSale} quantity={quantityAvailable} /> : null}

      <form {...formProps({ beforeSubmit: openCartDrawer })} className="space-y-4">
        <input type="hidden" {...register("merchandiseId", {})} />
        {engraving && engravingText ? <input type="hidden" {...register("attributeValue", { key: "Engraving", value: engravingText })} /> : null}
        {engraving ? (
          <div>
            <label htmlFor={`engrave-${product.handle}`} className="field-label">Laser engraving <span className="font-normal text-stone">(optional, free)</span></label>
            <input id={`engrave-${product.handle}`} value={engravingText} onChange={(e) => setEngravingText(e.currentTarget.value.slice(0, 24))} maxLength={24} placeholder="Up to 24 characters" className="input" />
          </div>
        ) : null}
        <div className="flex gap-3">
          <div className="inline-flex items-center rounded-full border border-line">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center rounded-full hover:bg-bone" aria-label="Decrease quantity">
              <Icon name="minus" size={14} />
            </button>
            <input
              {...register("quantity", { value: qty })}
              onChange={(e) => setQuantity(Number(e.currentTarget.value) || 1)}
              inputMode="numeric"
              aria-label="Quantity"
              className="w-8 bg-transparent text-center tabular-nums focus:outline-none"
            />
            <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} className="grid size-11 place-items-center rounded-full hover:bg-bone" aria-label="Increase quantity">
              <Icon name="plus" size={14} />
            </button>
          </div>
          <button {...register("addToCart", {})} disabled={!addable} className="btn btn-primary min-h-12 flex-1">
            {pending ? "Adding…" : addable ? "Add to bag" : selectedVariant ? "Sold out" : "Select options"}
          </button>
        </div>
      </form>

      {selectedVariant ? (
        <div className="grid gap-2.5">
          <button type="button" onClick={buyNow} disabled={!addable || pending || busy} className="btn btn-secondary min-h-12 w-full">
            Buy it now
          </button>
          <ShopPayButton variants={[{ id: selectedVariant.id, quantity: qty }]} disabled={!addable || pending} width="100%" borderRadius="999px" />
        </div>
      ) : null}

      {matchedLineItem ? (
        <p className="text-[0.8125rem] text-graphite">
          <Icon name="check" size={15} className="mr-1 inline -translate-y-px text-moss" />
          {matchedLineItem.quantity} already in your bag.{" "}
          <button type="button" onClick={openCartDrawer} className="underline underline-offset-4">View bag</button>
        </p>
      ) : null}

      {errors.userErrors.length || errors.warnings.length || errors.networkErrors.length ? (
        <ul role="alert" className="space-y-1 text-[0.8125rem] text-danger">
          {[...errors.userErrors, ...errors.warnings, ...errors.networkErrors].map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
