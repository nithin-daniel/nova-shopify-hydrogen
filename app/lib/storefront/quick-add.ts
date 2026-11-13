/**
 * Code-driven "add to cart" for product cards (CUSTOM feature built on the
 * documented Standard Actions path, skill: hydrogen-cart-ui "Code-driven cart
 * changes"). `window.Shopify.actions.updateCart` emits the events the Hydrogen
 * cart store observes, so the add gets the same optimistic line, pending state
 * and rollback as a form submission.
 */
import { useCallback, useState } from "react";
import { useCart } from "./cart";
import { openCartDrawer } from "./cart-drawer";

export type QuickAddVariant = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  image?: { url: string; altText?: string | null } | null;
  product: { title: string; handle: string };
  selectedOptions?: { name: string; value: string }[];
};

export function useQuickAdd() {
  const loading = useCart((s) => s.loading);
  const hasCart = useCart((s) => Boolean(s.data.id));
  const pendingLines = useCart((s) => s.pending.lines.size);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (variant: QuickAddVariant, quantity = 1) => {
      const actions = window.Shopify?.actions;
      // Fallback: before the store configures updateCart, or while a first cart is
      // being created by another add, use the product page instead of risking a second cart.
      if (!actions || actions.updateCart.isDefault() || loading || (!hasCart && pendingLines > 0)) {
        window.location.assign(`/products/${variant.product.handle}`);
        return;
      }
      setBusy(true);
      setError(null);
      openCartDrawer();
      try {
        const result = await actions.updateCart(
          { lines: [{ merchandiseId: variant.id, quantity }] },
          { event: { detail: { products: [{ ...variant, id: variant.id, price: variant.price }] } } },
        );
        const problem = result.userErrors?.[0]?.message ?? result.warnings?.[0]?.message;
        if (problem) setError(problem);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add to cart");
      } finally {
        setBusy(false);
      }
    },
    [loading, hasCart, pendingLines],
  );

  return { add, busy, error, ready: !loading };
}
