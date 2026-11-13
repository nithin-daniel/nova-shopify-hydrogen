import { useState } from "react";
import { data, Form, useNavigation } from "react-router";
import type { Route } from "./+types/account.addresses";
import { requireCustomer } from "~/lib/account.server";
import { ADDRESS_CREATE, ADDRESS_DELETE, ADDRESS_UPDATE, CUSTOMER_QUERY } from "~/lib/queries/account.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const { data: result, errors } = await client.graphql(CUSTOMER_QUERY, { accessToken });
  if (errors || !result?.customer) throw new Response("Could not load addresses", { status: 500 });
  return { addresses: result.customer.addresses.nodes, defaultId: result.customer.defaultAddress?.id ?? null };
}

export async function action({ context, request }: Route.ActionArgs) {
  const { client, accessToken } = await requireCustomer(context, request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const id = String(form.get("addressId") ?? "");
  const field = (k: string) => String(form.get(k) ?? "").trim() || undefined;
  const address = {
    firstName: field("firstName"),
    lastName: field("lastName"),
    company: field("company"),
    address1: field("address1"),
    address2: field("address2"),
    city: field("city"),
    zoneCode: field("zoneCode"),
    zip: field("zip"),
    countryCode: field("territoryCode") as never,
    phoneNumber: field("phoneNumber"),
  };
  const makeDefault = form.get("defaultAddress") === "on";
  let errors: { message: string }[];
  if (intent === "delete") {
    const r = await client.graphql(ADDRESS_DELETE, { accessToken, variables: { addressId: id } });
    errors = r.data?.customerAddressDelete?.userErrors ?? (r.errors ? [{ message: "Delete failed" }] : []);
  } else if (intent === "default") {
    const r = await client.graphql(ADDRESS_UPDATE, { accessToken, variables: { addressId: id, defaultAddress: true } });
    errors = r.data?.customerAddressUpdate?.userErrors ?? [];
  } else if (intent === "update") {
    const r = await client.graphql(ADDRESS_UPDATE, { accessToken, variables: { addressId: id, address, defaultAddress: makeDefault || undefined } });
    errors = r.data?.customerAddressUpdate?.userErrors ?? (r.errors ? [{ message: "Update failed" }] : []);
  } else {
    const r = await client.graphql(ADDRESS_CREATE, { accessToken, variables: { address, defaultAddress: makeDefault } });
    errors = r.data?.customerAddressCreate?.userErrors ?? (r.errors ? [{ message: "Could not save address" }] : []);
  }
  if (errors.length) return data({ ok: false, intent, id, errors: errors.map((e) => e.message) }, { status: 400 });
  return { ok: true, intent, id, errors: [] as string[] };
}

type Address = Route.ComponentProps["loaderData"]["addresses"][number];

export default function Addresses({ loaderData, actionData }: Route.ComponentProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const { addresses, defaultId } = loaderData;
  return (
    <div className="space-y-12">
      <h1 className="display text-display-sm">Addresses</h1>
      {actionData && !actionData.ok ? <ul role="alert" className="text-sm text-danger">{actionData.errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="border border-line p-5">
            {editing === a.id ? (
              <AddressForm address={a} intent="update" onDone={() => setEditing(null)} />
            ) : (
              <>
                {a.id === defaultId ? <span className="badge badge-ink mb-3">Default</span> : null}
                <address className="text-sm leading-relaxed text-graphite not-italic">{a.formatted.map((l, i) => <span key={i} className="block">{l}</span>)}</address>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => setEditing(a.id)} className="underline underline-offset-4">Edit</button>
                  {a.id !== defaultId ? (
                    <Form method="post"><input type="hidden" name="addressId" value={a.id} /><button name="intent" value="default" className="underline underline-offset-4">Make default</button></Form>
                  ) : null}
                  <Form method="post" onSubmit={(e) => { if (!confirm("Delete this address?")) e.preventDefault(); }}>
                    <input type="hidden" name="addressId" value={a.id} />
                    <button name="intent" value="delete" className="text-danger underline underline-offset-4">Delete</button>
                  </Form>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <section className="border-t border-line pt-10">
        <h2 className="mb-6 text-lg font-medium">Add a new address</h2>
        <AddressForm intent="create" />
      </section>
    </div>
  );
}

function AddressForm({ address, intent, onDone }: { address?: Address; intent: "create" | "update"; onDone?: () => void }) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
  const id = address?.id ?? "new";
  const f = (name: string, label: string, value?: string | null, opts: { required?: boolean; autoComplete?: string; className?: string } = {}) => (
    <div className={opts.className}>
      <label htmlFor={`${id}-${name}`} className="field-label">{label}{opts.required ? "" : <span className="font-normal text-stone"> (optional)</span>}</label>
      <input id={`${id}-${name}`} name={name} defaultValue={value ?? ""} required={opts.required} autoComplete={opts.autoComplete} className="input" />
    </div>
  );
  return (
    <Form method="post" className="grid gap-5 sm:grid-cols-2" onSubmit={() => onDone && setTimeout(onDone, 400)} key={address?.id ?? navigation.state}>
      <input type="hidden" name="intent" value={intent} />
      {address ? <input type="hidden" name="addressId" value={address.id} /> : null}
      {f("firstName", "First name", address?.firstName, { required: true, autoComplete: "given-name" })}
      {f("lastName", "Last name", address?.lastName, { required: true, autoComplete: "family-name" })}
      {f("company", "Company", address?.company, { className: "sm:col-span-2", autoComplete: "organization" })}
      {f("address1", "Address", address?.address1, { required: true, className: "sm:col-span-2", autoComplete: "address-line1" })}
      {f("address2", "Apartment, suite", address?.address2, { className: "sm:col-span-2", autoComplete: "address-line2" })}
      {f("city", "City", address?.city, { required: true, autoComplete: "address-level2" })}
      {f("zoneCode", "State / province code", address?.zoneCode, { autoComplete: "address-level1" })}
      {f("zip", "Postal code", address?.zip, { required: true, autoComplete: "postal-code" })}
      <div>
        <label htmlFor={`${id}-country`} className="field-label">Country</label>
        <select id={`${id}-country`} name="territoryCode" defaultValue={address?.countryCode ?? "US"} className="input">
          {[["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["FR", "France"], ["DE", "Germany"], ["AU", "Australia"], ["JP", "Japan"]].map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      {f("phoneNumber", "Phone", address?.phoneNumber, { autoComplete: "tel" })}
      <label className="flex items-center gap-2.5 self-end text-sm sm:col-span-2"><input type="checkbox" name="defaultAddress" className="checkbox" /> Set as default address</label>
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : intent === "create" ? "Add address" : "Save changes"}</button>
        {onDone ? <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">Cancel</button> : null}
      </div>
    </Form>
  );
}
