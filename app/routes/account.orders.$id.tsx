import type { Route } from "./+types/account.orders.$id";
import { Icon, Price, ShopImage } from "~/components/ui";
import { requireCustomer } from "~/lib/account.server";
import { STATUS_LABEL, statusLabel } from "~/lib/storefront/order-status";
import { ORDER_QUERY } from "~/lib/queries/account.server";
import { Link } from "~/lib/storefront/locale";

export async function loader({ context, request, params }: Route.LoaderArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const { data, errors } = await client.graphql(ORDER_QUERY, { accessToken, variables: { id: `gid://shopify/Order/${params.id}` } });
  if (errors) throw new Response("Order query failed", { status: 500 });
  if (!data?.order) throw new Response("Order not found", { status: 404 });
  return { order: data.order };
}

export const meta: Route.MetaFunction = ({ loaderData: d }) => [{ title: d ? `Order ${d.order.name} | NOVA` : "Order | NOVA" }];

const STEPS = ["CONFIRMED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function OrderDetail({ loaderData }: Route.ComponentProps) {
  const { order } = loaderData;
  const discount = order.discountApplications.nodes[0];
  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/account/orders" className="text-sm text-stone hover:text-ink">← All orders</Link>
          <h1 className="display mt-3 text-display-sm">Order {order.name}</h1>
          <p className="mt-2 text-graphite">Placed {new Date(order.processedAt).toLocaleDateString("en-US", { dateStyle: "long" })} · Confirmation {order.confirmationNumber}</p>
        </div>
        <div className="flex gap-2">
          <span className="status status-custom">{statusLabel(order.financialStatus)}</span>
          <span className="status status-custom">{order.cancelledAt ? "Cancelled" : order.fulfillmentStatus ? statusLabel(order.fulfillmentStatus) : "Processing"}</span>
        </div>
      </header>

      {order.cancelledAt ? (
        <p className="bg-bone p-5 text-sm">This order was cancelled on {new Date(order.cancelledAt).toLocaleDateString("en-US", { dateStyle: "medium" })}{order.cancelReason ? ` (${order.cancelReason.toLowerCase()})` : ""}. Refunded <Price price={order.totalRefunded} />.</p>
      ) : null}

      {order.fulfillments.nodes.map((f, i) => {
        const reached = STEPS.findIndex((s) => s === f.latestShipmentStatus || (s === "CONFIRMED" && ["LABEL_PRINTED", "LABEL_PURCHASED"].includes(f.latestShipmentStatus ?? "")));
        const current = Math.max(reached, f.latestShipmentStatus === "DELIVERED" ? 3 : f.latestShipmentStatus === "OUT_FOR_DELIVERY" ? 2 : f.latestShipmentStatus === "IN_TRANSIT" ? 1 : 0);
        const tracking = f.trackingInformation[0];
        return (
          <section key={f.id} className="border border-line p-6" aria-label={`Shipment ${i + 1}`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Shipment {order.fulfillments.nodes.length > 1 ? i + 1 : ""} · {statusLabel(f.latestShipmentStatus ?? "")}</h2>
              {tracking ? (
                <a href={tracking.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                  {tracking.company} {tracking.number} <Icon name="external" size={14} />
                </a>
              ) : null}
            </div>
            <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Delivery progress">
              {STEPS.map((s, idx) => (
                <li key={s} className="text-[0.75rem]">
                  <span className={`mb-2 block h-1 rounded-full ${idx <= current ? "bg-ink" : "bg-sand"}`} />
                  <span className={idx <= current ? "text-ink" : "text-stone"}>{STATUS_LABEL[s]}</span>
                </li>
              ))}
            </ol>
            {f.estimatedDeliveryAt && f.latestShipmentStatus !== "DELIVERED" ? <p className="mb-4 text-sm">Estimated delivery: <strong className="font-medium">{new Date(f.estimatedDeliveryAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong></p> : null}
            <ul className="space-y-2 border-l border-line pl-4 text-sm">
              {[...f.events.nodes].reverse().map((e) => (
                <li key={e.id} className="flex gap-4"><span className="w-32 shrink-0 text-stone">{fmt(e.happenedAt)}</span><span>{statusLabel(e.status)}</span></li>
              ))}
            </ul>
            <p className="mt-4 text-[0.8125rem] text-stone">Contains: {f.fulfillmentLineItems.nodes.map((l) => `${l.quantity}× ${l.lineItem.title}`).join(", ")}</p>
          </section>
        );
      })}
      {!order.fulfillments.nodes.length && !order.cancelledAt ? <p className="bg-bone p-5 text-sm">We're preparing your order. You'll get a tracking link as soon as it ships.</p> : null}

      <div className="grid gap-12 md:grid-cols-12">
        <section className="md:col-span-7" aria-label="Items">
          <ul className="divide-y divide-line border-y border-line">
            {order.lineItems.nodes.map((l) => (
              <li key={l.id} className="grid grid-cols-[4.5rem_1fr_auto] gap-4 py-4">
                <div className="bg-bone"><ShopImage image={l.image} aspect={4 / 5} widths={[144]} sizes="4.5rem" alt="" /></div>
                <div>
                  <p className="font-medium">{l.title}</p>
                  {l.variantTitle ? <p className="text-[0.8125rem] text-stone">{l.variantTitle}</p> : null}
                  <p className="text-[0.8125rem] text-stone">Qty {l.quantity} · <Price price={l.price} /></p>
                </div>
                <Price price={l.totalPrice} className="text-sm" />
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-8 md:col-span-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-graphite">Subtotal</dt><dd><Price price={order.subtotal} /></dd></div>
            {discount && "code" in discount ? <div className="flex justify-between text-ember"><dt>Discount ({discount.code})</dt><dd>{"amount" in discount.value ? <>−<Price price={discount.value} /></> : `${discount.value.percentage}%`}</dd></div> : null}
            <div className="flex justify-between"><dt className="text-graphite">Shipping{order.shippingLine ? ` (${order.shippingLine.title})` : ""}</dt><dd><Price price={order.totalShipping} /></dd></div>
            <div className="flex justify-between"><dt className="text-graphite">Tax</dt><dd><Price price={order.totalTax} /></dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd><Price price={order.totalPrice} /></dd></div>
            {Number(order.totalRefunded.amount) > 0 ? <div className="flex justify-between text-graphite"><dt>Refunded</dt><dd>−<Price price={order.totalRefunded} /></dd></div> : null}
          </dl>
          {order.shippingAddress ? (
            <div>
              <h2 className="eyebrow mb-2">Shipping to</h2>
              <address className="text-sm leading-relaxed text-graphite not-italic">{order.shippingAddress.formatted.map((l, i) => <span key={i} className="block">{l}</span>)}</address>
            </div>
          ) : null}
          {order.note ? <p className="text-sm text-graphite"><span className="eyebrow mb-1 block">Note</span>{order.note}</p> : null}
        </aside>
      </div>
    </div>
  );
}
