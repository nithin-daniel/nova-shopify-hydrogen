/**
 * Full cart page: the no-JS fallback for the drawer (the root loader awaits the
 * cart on this route so the HTML is complete). Line, discount, note and
 * attribute forms post to Hydrogen's /api/cart handler; gift cards use the
 * action below.
 */
import { getCartId } from "@shopify/hydrogen";
import { data } from "react-router";
import type { Route } from "./+types/cart";
import { useViewEvent } from "~/components/analytics";
import { CartLines } from "~/components/cart/cart-lines";
import { CartRecommendations } from "~/components/cart/cart-recommendations";
import { CartErrorBanner, CartTotals, CheckoutActions, DiscountCodes, FreeShippingProgress, GiftCardForm, GiftWrapToggle, OrderNote } from "~/components/cart/cart-summary";
import { CART_GIFT_CARD_CODES_UPDATE } from "~/lib/queries/cart.server";
import { shopifyContext } from "~/lib/shopify/context";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";
import { useCart } from "~/lib/storefront/cart";
import { Link } from "~/lib/storefront/locale";

export const meta: Route.MetaFunction = () => [{ title: "Your bag | NOVA" }, { name: "robots", content: "noindex" }];

export async function action({ request, context }: Route.ActionArgs) {
  const { storefront } = context.get(shopifyContext);
  const form = await request.formData();
  if (form.get("intent") !== "gift-card-apply") return data({ ok: false, message: "Unknown action" }, { status: 400 });
  const cartId = getCartId(request);
  if (!cartId) return data({ ok: false, message: "Add something to your bag first." }, { status: 400 });
  const code = String(form.get("code") ?? "").trim();
  if (!code) return data({ ok: false, message: "Enter a gift card code." }, { status: 400 });
  // Keep already-applied cards: cartGiftCardCodesUpdate replaces the list.
  const existing = form.getAll("existing").map(String).map((id) => id.split("/").pop()!);
  const { data: result, errors } = await storefront.graphql(CART_GIFT_CARD_CODES_UPDATE, {
    variables: { cartId, giftCardCodes: [...existing, code] },
  });
  if (errors) return data({ ok: false, message: "Gift card could not be applied." }, { status: 500 });
  const userError = result?.cartGiftCardCodesUpdate?.userErrors[0];
  if (userError) return { ok: false, message: userError.message };
  return { ok: true };
}

export default function CartPage() {
  const loading = useCart((s) => s.loading);
  const hasLines = useCart((s) => s.data.lines.nodes.length > 0);
  const count = useCart((s) => s.data.totalQuantity);
  useViewEvent(() => getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, { cart: null }), "cart");

  return (
    <section className="container-nova pt-10">
      <h1 className="display mb-10 text-display">
        Your <span className="serif-accent">bag</span>
        {count ? <span className="ml-3 align-top text-2xl text-stone tabular-nums">{count}</span> : null}
      </h1>
      <CartErrorBanner />
      {loading ? (
        <div className="skeleton h-64" role="status" aria-label="Loading cart" />
      ) : !hasLines ? (
        <div className="grid gap-6 border-y border-line py-20">
          <p className="display text-3xl">Your bag is <span className="serif-accent">empty.</span></p>
          <p className="max-w-md text-graphite">Free shipping over $150 and 30-day returns on everything.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/collections/best-sellers" className="btn btn-primary">Shop best sellers</Link>
            <Link to="/collections/new-arrivals" className="btn btn-secondary">New arrivals</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FreeShippingProgress />
            <div className="mt-6 border-t border-line"><CartLines variant="page" /></div>
            <CartRecommendations title="Complete your setup" />
          </div>
          <aside className="lg:col-span-5" aria-label="Order summary">
            <div className="space-y-6 bg-bone p-6 md:p-8 lg:sticky lg:top-24">
              <h2 className="text-lg font-medium">Summary</h2>
              <DiscountCodes />
              <GiftCardForm />
              <div className="border-t border-line pt-5"><GiftWrapToggle /></div>
              <OrderNote />
              <div className="border-t border-line pt-5"><CartTotals /></div>
              <CheckoutActions />
              <p className="text-[0.75rem] leading-relaxed text-stone">
                Try codes <code className="code-inline">WELCOME10</code>, <code className="code-inline">SAVE20</code>, <code className="code-inline">SOUND15</code>, <code className="code-inline">SUMMER25</code> (expired) and gift card <code className="code-inline">NOVAGIFT50</code>.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
