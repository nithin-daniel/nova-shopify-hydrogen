/**
 * Accessible cart drawer (skill: hydrogen-cart-drawer). Rendered once in the
 * root layout as a native <dialog>; opened by the header's /cart anchor, by
 * add-to-cart forms and by `window.Shopify.actions.openCart()`.
 */
import { useEffect, useRef } from "react";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";
import { useCart } from "~/lib/storefront/cart";
import { CART_DRAWER_ID, closeCartDrawer, configureOpenCartAction } from "~/lib/storefront/cart-drawer";
import { Link } from "~/lib/storefront/locale";
import { Icon } from "~/components/ui";
import { CartLines } from "./cart-lines";
import { CartRecommendations } from "./cart-recommendations";
import { CartErrorBanner, CartTotals, CheckoutActions, DiscountCodes, FreeShippingProgress } from "./cart-summary";

export function CartDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const loading = useCart((s) => s.loading);
  const count = useCart((s) => s.data.totalQuantity);
  const hasLines = useCart((s) => s.data.lines.nodes.length > 0);

  useEffect(() => {
    configureOpenCartAction();
    const dialog = ref.current;
    if (!dialog) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, { cart: null });
    };
    dialog.addEventListener("toggle", onToggle);
    return () => dialog.removeEventListener("toggle", onToggle);
  }, []);

  return (
    <dialog ref={ref} id={CART_DRAWER_ID} className="drawer" aria-labelledby="cart-drawer-title" {...{ closedby: "any" }}>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="cart-drawer-title" className="text-lg font-medium">
            Your bag {count > 0 ? <span className="text-stone tabular-nums">({count})</span> : null}
          </h2>
          <button type="button" onClick={closeCartDrawer} aria-label="Close cart" className="btn btn-ghost btn-icon -mr-2">
            <Icon name="close" />
          </button>
        </header>
        <CartErrorBanner />

        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <div role="status" aria-label="Loading cart" className="space-y-5 py-6">
              {[0, 1].map((i) => (
                <div key={i} className="grid grid-cols-[5.5rem_1fr] gap-4">
                  <div className="skeleton aspect-[4/5]" />
                  <div className="space-y-2 pt-1"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : hasLines ? (
            <>
              <div className="py-5"><FreeShippingProgress /></div>
              <CartLines onNavigate={closeCartDrawer} />
              <CartRecommendations />
            </>
          ) : (
            <div className="flex h-full flex-col items-start justify-center gap-5 py-16">
              <p className="display text-3xl">Your bag is <span className="serif-accent">empty.</span></p>
              <p className="text-graphite">Start with the pieces our customers love most.</p>
              <Link to="/collections/best-sellers" onClick={closeCartDrawer} className="btn btn-primary">Shop best sellers</Link>
            </div>
          )}
        </div>

        {hasLines && !loading ? (
          <footer className="space-y-4 border-t border-line bg-paper px-6 py-5">
            <DiscountCodes />
            <CartTotals />
            <CheckoutActions />
            <Link to="/cart" onClick={closeCartDrawer} className="block text-center text-[0.8125rem] text-graphite underline underline-offset-4">
              View full bag, add a note or gift card
            </Link>
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
