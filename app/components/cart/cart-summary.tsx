/**
 * Cart footer content shared by the drawer and /cart: discount codes, gift
 * cards, order note, gift wrap attribute, server-provided totals, checkout and
 * Shop Pay. All money comes from the cart response (never computed here).
 */
import { ShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useFetcher } from "react-router";
import { Icon, Price } from "~/components/ui";
import { useCart, useCartActions, useCartForm } from "~/lib/storefront/cart";
import { useLocale, useLocalizedPath } from "~/lib/storefront/locale";
import { formatPrice } from "~/lib/storefront/money";
import { freeShippingProgress } from "~/lib/storefront/shipping";

export function FreeShippingProgress() {
  const subtotal = useCart((s) => s.data.cost?.subtotalAmount);
  const pending = useCart((s) => s.pending.cost || s.revalidating);
  const { intlLocale } = useLocale();
  const progress = freeShippingProgress(subtotal);
  if (!progress) return null;
  return (
    <div className={pending ? "is-pending" : undefined}>
      <p className="mb-2 text-[0.8125rem] text-graphite" aria-live="polite">
        {progress.reached ? (
          <>
            <Icon name="truck" size={15} className="mr-1.5 inline -translate-y-px" />
            Free standard shipping unlocked.
          </>
        ) : (
          <>
            You're <strong className="font-medium text-ink">{formatPrice(progress.remaining, intlLocale)}</strong> away from free shipping.
          </>
        )}
      </p>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)} aria-label="Progress to free shipping">
        <div className="h-full rounded-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${progress.ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function CartErrorBanner() {
  const errors = useCart((s) => s.errors);
  const lines = useCart((s) => s.data.lines.nodes);
  const [dismissedAt, setDismissedAt] = useState(0);
  const messages = useMemo(() => {
    const lineIds = new Set(lines.map((l) => l.id));
    const orphaned = [...errors.lines.entries()].filter(([id]) => !lineIds.has(id)).flatMap(([, g]) => g.userErrors.map((e) => e.message));
    return [
      ...errors.network.map((e) => e.message),
      ...errors.cart.userErrors.map((e) => e.message),
      ...errors.cart.warnings.map((e) => e.message),
      ...orphaned,
    ];
  }, [errors, lines]);
  if (!messages.length || (errors.lastUpdatedAt ?? 0) <= dismissedAt) return null;
  return (
    <div role="alert" className="flex items-start gap-3 bg-danger-soft px-4 py-3 text-[0.8125rem] text-danger">
      <ul className="flex-1 space-y-1">{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
      <button type="button" onClick={() => setDismissedAt(errors.lastUpdatedAt ?? Date.now())} aria-label="Dismiss cart message" className="-m-1 p-1">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export function DiscountCodes() {
  const { formProps, register } = useCartForm();
  const codes = useCart((s) => s.data.discountCodes);
  const pendingCodes = useCart((s) => s.pending.discountCodes);
  const codeErrors = useCart((s) => s.errors.discountCodes);
  const inputId = useId();
  const [draft, setDraft] = useState("");

  function guard(event: FormEvent<HTMLFormElement>) {
    const value = draft.trim();
    if (!value || codes.some((c) => c.code.toLowerCase() === value.toLowerCase())) {
      event.preventDefault();
      return;
    }
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <form {...formProps({ beforeSubmit: guard })} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">Discount code</label>
          <input
            id={inputId}
            {...register("discountCode", { value: draft })}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="Discount code"
            autoComplete="off"
            className="input text-sm uppercase placeholder:normal-case"
          />
        </div>
        <button type="submit" {...register("discount-apply")} className="btn btn-secondary btn-sm">Apply</button>
      </form>
      {codes.length ? (
        <ul className="flex flex-wrap gap-2">
          {codes.map((c) => {
            const pending = pendingCodes.has(c.code);
            const group = codeErrors.get(c.code);
            return (
              <li key={c.code}>
                <form {...formProps()} className={`chip ${pending ? "is-pending" : ""} ${c.applicable ? "" : "border-dashed text-stone"}`}>
                  <input type="hidden" {...register("discountCode", { value: c.code })} />
                  <Icon name="tag" size={13} />
                  <span className="font-mono text-[0.75rem] tracking-wide">{c.code}</span>
                  {!pending && !c.applicable ? <span className="text-[0.75rem]">· not applicable</span> : null}
                  <button type="submit" {...register("discount-remove")} aria-label={`Remove discount ${c.code}`} className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-bone">
                    <Icon name="close" size={12} />
                  </button>
                </form>
                {group?.userErrors.length ? <p role="alert" className="mt-1 text-[0.75rem] text-danger">{group.userErrors[0].message}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Gift cards use `cartGiftCardCodesUpdate`, which Hydrogen's cart handlers do
 * not wrap. The app runs it in the /cart route action (an out-of-band
 * mutation) and then calls `refresh()` so every cart consumer updates.
 */
export function GiftCardForm() {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { refresh } = useCartActions();
  const cartId = useCart((s) => s.data.id);
  const applied = useCart((s) => s.data.appliedGiftCards ?? []);
  const localize = useLocalizedPath();
  const inputId = useId();
  const lastData = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && fetcher.data !== lastData.current) {
      lastData.current = fetcher.data;
      if (fetcher.data.ok) refresh();
    }
  }, [fetcher.state, fetcher.data, refresh]);

  if (!cartId) return null;
  return (
    <div className="space-y-2">
      <fetcher.Form method="post" action={localize("/cart")} className="flex items-end gap-2">
        <input type="hidden" name="intent" value="gift-card-apply" />
        {applied.map((g) => <input key={g.id} type="hidden" name="existing" value={g.id} />)}
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">Gift card code</label>
          <input id={inputId} name="code" placeholder="Gift card" autoComplete="off" className="input text-sm uppercase placeholder:normal-case" required />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={fetcher.state !== "idle"}>
          {fetcher.state !== "idle" ? "Applying…" : "Redeem"}
        </button>
      </fetcher.Form>
      {fetcher.data && !fetcher.data.ok ? <p role="alert" className="text-[0.75rem] text-danger">{fetcher.data.message}</p> : null}
      {applied.length ? (
        <ul className="space-y-1 text-[0.8125rem] text-graphite">
          {applied.map((g) => (
            <li key={g.id} className="flex justify-between">
              <span>Gift card ···{g.lastCharacters}</span>
              <span>
                −<Price price={g.amountUsed} /> <span className="text-stone">(<Price price={g.balance} /> left)</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function OrderNote() {
  const { formProps, register } = useCartForm();
  const note = useCart((s) => s.data.note ?? "");
  const pending = useCart((s) => s.pending.note);
  const errors = useCart((s) => s.errors.note);
  const [draft, setDraft] = useState(note);
  const id = useId();
  useEffect(() => {
    if (!pending) setDraft(note);
  }, [note, pending]);
  return (
    <form
      {...formProps({
        beforeSubmit: (e) => {
          if (draft === note) e.preventDefault();
        },
      })}
      className="space-y-2"
    >
      <label htmlFor={id} className="field-label">Order note</label>
      <textarea id={id} {...register("note", { value: draft })} onChange={(e) => setDraft(e.currentTarget.value)} rows={2} className="input input-boxed resize-none text-sm" placeholder="Delivery instructions, gift message…" />
      <div className="flex items-center justify-between">
        {errors.userErrors.length ? <p role="alert" className="text-[0.75rem] text-danger">{errors.userErrors[0].message}</p> : <span />}
        <button type="submit" {...register("note-update")} className="btn btn-ghost btn-sm" aria-busy={pending}>
          {pending ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  );
}

/** Cart attribute editor: attribute updates replace the complete list. */
export function GiftWrapToggle() {
  const { formProps, register } = useCartForm();
  const attributes = useCart((s) => s.data.attributes ?? []);
  const pending = useCart((s) => s.pending.attributes);
  const key = "Gift wrap";
  const enabled = attributes.find((a) => a.key === key)?.value === "Yes";
  const others = attributes.filter((a) => a.key !== key);
  return (
    <form {...formProps()} className={`flex items-center justify-between gap-3 ${pending ? "is-pending" : ""}`}>
      {others.map((a) => <input key={a.key} type="hidden" {...register("attributeValue", { key: a.key, value: a.value ?? "" })} />)}
      {!enabled ? <input type="hidden" {...register("attributeValue", { key, value: "Yes" })} /> : null}
      <span className="text-[0.8125rem] text-graphite">
        <Icon name="box" size={15} className="mr-1.5 inline -translate-y-px" />
        Gift wrap in recycled paper {enabled ? <span className="badge badge-moss ml-1">Added</span> : <span className="text-stone">(free)</span>}
      </span>
      <button type="submit" {...register("attributes-update")} disabled={pending} className="btn btn-ghost btn-sm">
        {enabled ? "Remove" : "Add"}
      </button>
    </form>
  );
}

export function CartTotals() {
  const cost = useCart((s) => s.data.cost);
  const codes = useCart((s) => s.data.discountCodes);
  const giftCards = useCart((s) => s.data.appliedGiftCards ?? []);
  const pending = useCart((s) => s.pending.cost || s.revalidating);
  const { intlLocale } = useLocale();
  if (!cost) return null;
  const showCharge = giftCards.length > 0 && cost.checkoutChargeAmount;
  return (
    <dl className={`space-y-1.5 text-sm ${pending ? "is-pending" : ""}`} aria-busy={pending}>
      <div className="flex justify-between">
        <dt className="text-graphite">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(cost.subtotalAmount, intlLocale)}</dd>
      </div>
      {codes.some((c) => c.applicable) ? (
        <div className="flex justify-between text-ember">
          <dt>Discounts applied</dt>
          <dd>{codes.filter((c) => c.applicable).map((c) => c.code).join(", ")}</dd>
        </div>
      ) : null}
      <div className="flex justify-between text-graphite">
        <dt>Shipping &amp; taxes</dt>
        <dd>Calculated at checkout</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(cost.totalAmount, intlLocale)}</dd>
      </div>
      {showCharge ? (
        <div className="flex justify-between text-graphite">
          <dt>Due after gift cards</dt>
          <dd className="tabular-nums">{formatPrice(cost.checkoutChargeAmount, intlLocale)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function CheckoutActions() {
  const pending = useCart((s) => s.pending.cost || s.revalidating || s.pending.lines.size > 0);
  const hasLines = useCart((s) => s.data.lines.nodes.length > 0);
  if (!hasLines) return null;
  return (
    <div className="space-y-2.5">
      {/* /checkout is handled by handleShopifyRoutes: it redirects to cart.checkoutUrl. */}
      <a href="/checkout" className="btn btn-primary w-full" aria-disabled={pending || undefined} onClick={(e) => pending && e.preventDefault()}>
        Checkout
        <Icon name="arrow" size={16} />
      </a>
      <ShopPayButton disabled={pending} width="100%" borderRadius="999px" />
    </div>
  );
}
