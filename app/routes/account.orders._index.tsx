import type { Route } from "./+types/account.orders._index";
import { Price, ShopImage } from "~/components/ui";
import { requireCustomer } from "~/lib/account.server";
import { statusLabel } from "~/lib/storefront/order-status";
import { ORDERS_QUERY } from "~/lib/queries/account.server";
import { Link } from "~/lib/storefront/locale";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const after = new URL(request.url).searchParams.get("after");
  const { data, errors } = await client.graphql(ORDERS_QUERY, { accessToken, variables: { first: 10, after } });
  if (errors || !data?.customer) return { orders: [], pageInfo: null, error: "We couldn't load your orders." };
  return { orders: data.customer.orders.nodes, pageInfo: data.customer.orders.pageInfo, error: null };
}

const tone = (s: string | null) => !s ? "status-custom" : (["DELIVERED", "FULFILLED", "PAID"].includes(s) ? "status-real" : ["REFUNDED", "VOIDED"].includes(s) ? "status-na" : s.includes("REFUND") ? "status-creds" : "status-mock");

export default function Orders({ loaderData }: Route.ComponentProps) {
  const { orders, pageInfo, error } = loaderData;
  return (
    <div>
      <h1 className="display mb-8 text-display-sm">Orders</h1>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {!error && !orders.length ? <p className="border-y border-line py-10 text-graphite">You haven't placed any orders yet.</p> : null}
      <ul className="space-y-4">
        {orders.map((o) => {
          const shipment = o.fulfillments.nodes[0]?.latestShipmentStatus;
          const state = o.cancelledAt ? "Cancelled" : shipment ? statusLabel(shipment) : (o.fulfillmentStatus ? statusLabel(o.fulfillmentStatus) : "Processing");
          return (
            <li key={o.id}>
              <Link to={`/account/orders/${o.id.split("/").pop()}`} className="grid gap-4 border border-line p-5 transition hover:border-ink md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex items-center gap-5">
                  <div className="flex -space-x-3">
                    {o.lineItems.nodes.slice(0, 3).map((l) => <div key={l.id} className="size-14 overflow-hidden rounded-full border-2 border-paper bg-bone"><ShopImage image={l.image} aspect={1} widths={[112]} sizes="3.5rem" alt="" /></div>)}
                  </div>
                  <div>
                    <p className="font-medium">Order {o.name}</p>
                    <p className="text-[0.8125rem] text-stone">{new Date(o.processedAt).toLocaleDateString("en-US", { dateStyle: "long" })} · {o.lineItems.nodes.reduce((n, l) => n + l.quantity, 0)} items</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span className={`status ${o.cancelledAt ? "status-na" : tone(shipment ?? o.fulfillmentStatus)}`}>{state}</span>
                  <span className={`status ${tone(o.financialStatus)}`}>{statusLabel(o.financialStatus)}</span>
                  <Price price={o.totalPrice} className="font-medium" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {pageInfo?.hasNextPage ? <Link to={`/account/orders?after=${pageInfo.endCursor}`} className="btn btn-secondary mt-8">Older orders</Link> : null}
    </div>
  );
}
