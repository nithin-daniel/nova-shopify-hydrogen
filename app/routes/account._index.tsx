import { data, Form, useNavigation } from "react-router";
import type { Route } from "./+types/account._index";
import { Price, ShopImage } from "~/components/ui";
import { requireCustomer } from "~/lib/account.server";
import { statusLabel } from "~/lib/storefront/order-status";
import { CUSTOMER_QUERY, CUSTOMER_UPDATE } from "~/lib/queries/account.server";
import { Link } from "~/lib/storefront/locale";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const { data: result, errors } = await client.graphql(CUSTOMER_QUERY, { accessToken });
  if (errors || !result?.customer) return { customer: null, error: "We couldn't load your account right now." };
  // Only derived profile fields are returned; tokens never leave the server.
  return { customer: result.customer, error: null };
}

export async function action({ context, request }: Route.ActionArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const form = await request.formData();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const { data: result, errors } = await client.graphql(CUSTOMER_UPDATE, { accessToken, variables: { input: { firstName, lastName } } });
  if (errors) return data({ ok: false, message: "Update failed. Please try again." }, { status: 500 });
  const userError = result?.customerUpdate?.userErrors[0];
  return userError ? { ok: false, message: userError.message } : { ok: true, message: "Profile saved." };
}

export default function AccountOverview({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  if (!loaderData.customer) return <p role="alert" className="text-danger">{loaderData.error}</p>;
  const c = loaderData.customer;
  return (
    <div className="space-y-14">
      <header>
        <h1 className="display text-display-sm">Hello, <span className="serif-accent">{c.firstName ?? "there"}.</span></h1>
        <p className="mt-3 text-graphite">Member since {new Date(c.creationDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}{c.tags.includes("VIP") ? " · VIP" : ""}</p>
      </header>

      <section aria-labelledby="recent-orders">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="recent-orders" className="text-lg font-medium">Recent orders</h2>
          <Link to="/account/orders" className="text-sm underline underline-offset-4">All orders</Link>
        </div>
        {c.orders.nodes.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {c.orders.nodes.map((o) => (
              <li key={o.id}>
                <Link to={`/account/orders/${o.id.split("/").pop()}`} className="flex flex-wrap items-center gap-4 py-4 hover:bg-bone/60">
                  <div className="flex -space-x-3">
                    {o.lineItems.nodes.slice(0, 3).map((l) => (
                      <div key={l.id} className="size-12 overflow-hidden rounded-full border-2 border-paper bg-bone"><ShopImage image={l.image} aspect={1} widths={[96]} sizes="3rem" alt="" /></div>
                    ))}
                  </div>
                  <div className="min-w-32 flex-1">
                    <p className="font-medium">Order {o.name}</p>
                    <p className="text-[0.8125rem] text-stone">{new Date(o.processedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                  </div>
                  <span className="status status-custom">{statusLabel(o.fulfillmentStatus)}</span>
                  <Price price={o.totalPrice} className="w-24 justify-end text-sm" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-line py-8 text-graphite">No orders yet. <Link to="/collections/best-sellers" className="underline">Find something you love.</Link></p>
        )}
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <section aria-labelledby="profile">
          <h2 id="profile" className="mb-5 text-lg font-medium">Profile</h2>
          <Form method="post" className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="firstName" className="field-label">First name</label><input id="firstName" name="firstName" defaultValue={c.firstName ?? ""} className="input" /></div>
              <div><label htmlFor="lastName" className="field-label">Last name</label><input id="lastName" name="lastName" defaultValue={c.lastName ?? ""} className="input" /></div>
            </div>
            <div><span className="field-label">Email</span><p className="text-sm">{c.emailAddress?.emailAddress}</p></div>
            {c.phoneNumber ? <div><span className="field-label">Phone</span><p className="text-sm">{c.phoneNumber.phoneNumber}</p></div> : null}
            <div className="flex items-center gap-4">
              <button type="submit" className="btn btn-secondary btn-sm" disabled={navigation.state !== "idle"}>{navigation.state === "submitting" ? "Saving…" : "Save profile"}</button>
              {actionData ? <p role="status" className={`text-sm ${actionData.ok ? "text-moss" : "text-danger"}`}>{actionData.message}</p> : null}
            </div>
          </Form>
        </section>
        <section aria-labelledby="default-address">
          <h2 id="default-address" className="mb-5 text-lg font-medium">Default address</h2>
          {c.defaultAddress ? (
            <address className="text-sm leading-relaxed text-graphite not-italic">{c.defaultAddress.formatted.map((line, i) => <span key={i} className="block">{line}</span>)}</address>
          ) : (
            <p className="text-sm text-graphite">No address saved yet.</p>
          )}
          <Link to="/account/addresses" className="mt-4 inline-block text-sm underline underline-offset-4">Manage addresses</Link>
        </section>
      </div>
    </div>
  );
}
