/**
 * Cart line items, shared by the drawer and the /cart page so both keep the
 * same Hydrogen line-form contract (skill: hydrogen-cart-ui):
 *   hidden `set` submit + scoped `lineId` + editable `quantity` input,
 * with increase / decrease / remove as additional submit controls.
 */
import { useId, useMemo } from "react";
import { Icon, Price, ShopImage } from "~/components/ui";
import { useCart, useCartForm, type CartLineData } from "~/lib/storefront/cart";
import { Link } from "~/lib/storefront/locale";

export function CartLines({ variant = "drawer", onNavigate }: { variant?: "drawer" | "page"; onNavigate?: () => void }) {
  const lines = useCart((s) => s.data.lines.nodes);
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <CartLineItem key={line.id} line={line} variant={variant} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

function CartLineItem({ line, variant, onNavigate }: { line: CartLineData; variant: "drawer" | "page"; onNavigate?: () => void }) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((s) => s.pending.lines);
  const lineErrors = useCart((s) => s.errors.lines);
  const pending = pendingLines.has(line.id);
  const group = lineErrors.get(line.id);
  const messages = useMemo(() => [...(group?.userErrors ?? []), ...(group?.warnings ?? [])].map((e) => e.message), [group]);
  const errorId = useId();
  const merchandise = line.merchandise;
  const handle = merchandise?.product?.handle;
  const options = (merchandise?.selectedOptions ?? []).filter((o) => o.value !== "Default Title");
  const attributes = (line.attributes ?? []).filter((a) => !a.key.startsWith("_"));
  const allocations = line.discountAllocations ?? [];
  const href = handle ? `/products/${handle}?${new URLSearchParams(options.map((o) => [o.name, o.value])).toString()}` : undefined;
  const big = variant === "page";

  return (
    <li className={`grid gap-4 py-5 ${big ? "grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr_auto]" : "grid-cols-[5.5rem_1fr]"}`}>
      <div className="overflow-hidden bg-bone">
        <ShopImage image={merchandise?.image} aspect={4 / 5} widths={[160, 240]} sizes="8rem" alt={merchandise?.product?.title ?? ""} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          {href ? (
            <Link to={href} onClick={onNavigate} className="link-underline truncate font-medium">
              {merchandise?.product?.title ?? merchandise?.title}
            </Link>
          ) : (
            <span className="font-medium">{merchandise?.product?.title ?? "Product"}</span>
          )}
          {!big ? <LinePrice line={line} pending={pending} /> : null}
        </div>
        {options.length > 0 ? <p className="text-[0.8125rem] text-stone">{options.map((o) => o.value).join(" · ")}</p> : null}
        {attributes.map((a) => (
          <p key={a.key} className="text-[0.8125rem] text-stone">
            {a.key}: {a.value}
          </p>
        ))}
        {merchandise?.availableForSale === false ? <p className="text-[0.8125rem] text-danger">No longer available</p> : null}
        {allocations.map((a, i) => (
          <p key={i} className={`inline-flex items-center gap-1.5 text-[0.8125rem] text-ember ${pending ? "is-pending" : ""}`}>
            <Icon name="tag" size={14} />
            {"code" in a && a.code ? a.code : "title" in a && a.title ? a.title : "Discount"} (−<Price price={a.discountedAmount} />)
          </p>
        ))}

        <form {...formProps()} className="mt-2 flex items-center gap-3" aria-label={`Quantity for ${merchandise?.product?.title ?? "item"}`}>
          <button {...register("set")} />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <div className="inline-flex items-center rounded-full border border-line">
            <button type="submit" {...register("decrease")} className="grid size-9 place-items-center rounded-full hover:bg-bone" aria-label="Decrease quantity">
              <Icon name="minus" size={14} />
            </button>
            <input
              {...register("quantity", { value: line.quantity, interactive: true })}
              className={`w-9 bg-transparent text-center text-sm tabular-nums [appearance:textfield] focus:outline-none ${pending ? "is-pending" : ""}`}
              aria-label="Quantity"
              aria-invalid={messages.length ? true : undefined}
              aria-describedby={messages.length ? errorId : undefined}
            />
            <button type="submit" {...register("increase")} className="grid size-9 place-items-center rounded-full hover:bg-bone" aria-label="Increase quantity">
              <Icon name="plus" size={14} />
            </button>
          </div>
          <button type="submit" {...register("remove")} className="text-[0.8125rem] text-stone underline-offset-4 hover:text-ink hover:underline">
            Remove
          </button>
        </form>
        {messages.length ? (
          <ul id={errorId} role="alert" className="text-[0.8125rem] text-danger">
            {messages.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        ) : null}
      </div>
      {big ? (
        <div className="col-start-2 sm:col-start-3 sm:text-right">
          <LinePrice line={line} pending={pending} />
        </div>
      ) : null}
    </li>
  );
}

function LinePrice({ line, pending }: { line: CartLineData; pending: boolean }) {
  const total = line.cost?.totalAmount;
  const subtotal = line.cost?.subtotalAmount;
  const compare = line.cost?.compareAtAmountPerQuantity;
  const hasDiscount = total && subtotal && Number(total.amount) < Number(subtotal.amount);
  return (
    <div className={`shrink-0 text-right text-sm ${pending ? "is-pending" : ""}`}>
      <Price price={total} compareAt={hasDiscount ? subtotal : undefined} />
      {compare && line.quantity === 1 && !hasDiscount ? (
        <p className="text-[0.75rem] text-stone line-through">
          <Price price={compare} />
        </p>
      ) : null}
    </div>
  );
}
