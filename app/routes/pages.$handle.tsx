import { data, useFetcher } from "react-router";
import type { Route } from "./+types/pages.$handle";
import { PAGE_QUERY } from "~/lib/queries/content.server";
import { shopifyContext } from "~/lib/shopify/context";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data: result, errors } = await storefront.graphql(PAGE_QUERY, { variables: { handle: params.handle } });
  if (errors) throw new Response("Page query failed", { status: 500 });
  if (!result?.page) throw new Response("Page not found", { status: 404 });
  return { page: result.page, canonical: new URL(request.url).origin + `/pages/${params.handle}` };
}

/**
 * Contact form (CUSTOM). The Storefront API has no contact-form mutation for
 * headless stores; production apps send this to a helpdesk or email API from
 * the server. This demo validates and acknowledges without sending anything.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const fields = { name: String(form.get("name") ?? "").trim(), email: String(form.get("email") ?? "").trim(), topic: String(form.get("topic") ?? ""), message: String(form.get("message") ?? "").trim() };
  const errors: Record<string, string> = {};
  if (!fields.name) errors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = "Enter a valid email address.";
  if (fields.message.length < 10) errors.message = "A little more detail helps us help you (10+ characters).";
  if (Object.keys(errors).length) return data({ ok: false as const, errors, fields }, { status: 400 });
  return { ok: true as const, ticket: `NV-${Math.floor(100000 + Math.random() * 899999)}`, name: fields.name };
}

export const meta: Route.MetaFunction = ({ loaderData: d }) =>
  d ? [{ title: `${d.page.seo?.title ?? d.page.title} | NOVA` }, { name: "description", content: d.page.seo?.description ?? d.page.bodySummary }, { tagName: "link", rel: "canonical", href: d.canonical }] : [];

export default function PageRoute({ loaderData }: Route.ComponentProps) {
  const { page } = loaderData;
  const isFaq = page.handle === "faq";
  return (
    <article className="container-nova grid gap-12 pt-12 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <p className="eyebrow mb-4">{isFaq ? "Help" : "NOVA"}</p>
        <h1 className="display text-display-sm">{page.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-graphite">{page.bodySummary}</p>
      </header>
      <div className="lg:col-span-7 lg:col-start-6">
        {isFaq ? <Faq html={page.body} /> : <div className="prose-nova" dangerouslySetInnerHTML={{ __html: page.body }} />}
        {page.handle === "contact" ? <ContactForm /> : null}
      </div>
    </article>
  );
}

/** Turns the FAQ page's <h3>/<p> pairs into accessible disclosure widgets. */
function Faq({ html }: { html: string }) {
  const items = [...html.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/gs)].map((m) => ({ q: m[1], a: m[2] }));
  return (
    <div className="border-t border-line">
      {items.map((item, i) => (
        <details key={item.q} open={i === 0} className="group border-b border-line">
          <summary className="flex items-center justify-between gap-6 py-5 text-lg font-medium">
            {item.q}
            <span aria-hidden="true" className="text-2xl font-light transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="pb-6 leading-relaxed text-graphite" dangerouslySetInnerHTML={{ __html: item.a }} />
        </details>
      ))}
    </div>
  );
}

function ContactForm() {
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;
  if (result?.ok) {
    return (
      <div className="mt-12 border-t border-line pt-10" role="status">
        <p className="display text-3xl">Thanks, {result.name}. <span className="serif-accent">We're on it.</span></p>
        <p className="mt-3 text-graphite">Reference {result.ticket}. We reply within one business day. (Demo: nothing was sent.)</p>
      </div>
    );
  }
  const errors = result && !result.ok ? result.errors : {};
  const fields = result && !result.ok ? result.fields : undefined;
  return (
    <fetcher.Form method="post" noValidate className="mt-12 grid gap-7 border-t border-line pt-10 md:grid-cols-2">
      <div>
        <label htmlFor="c-name" className="field-label">Name</label>
        <input id="c-name" name="name" autoComplete="name" defaultValue={fields?.name} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "c-name-e" : undefined} className="input" />
        {errors.name ? <p id="c-name-e" className="field-error">{errors.name}</p> : null}
      </div>
      <div>
        <label htmlFor="c-email" className="field-label">Email</label>
        <input id="c-email" name="email" type="email" autoComplete="email" defaultValue={fields?.email} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "c-email-e" : undefined} className="input" />
        {errors.email ? <p id="c-email-e" className="field-error">{errors.email}</p> : null}
      </div>
      <div className="md:col-span-2">
        <label htmlFor="c-topic" className="field-label">Topic</label>
        <select id="c-topic" name="topic" defaultValue={fields?.topic} className="input">
          <option>Order or delivery</option>
          <option>Returns and warranty</option>
          <option>Product question</option>
          <option>Press and partnerships</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="c-message" className="field-label">Message</label>
        <textarea id="c-message" name="message" rows={5} defaultValue={fields?.message} aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "c-message-e" : undefined} className="input input-boxed" />
        {errors.message ? <p id="c-message-e" className="field-error">{errors.message}</p> : null}
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={fetcher.state !== "idle"}>{fetcher.state !== "idle" ? "Sending…" : "Send message"}</button>
      </div>
    </fetcher.Form>
  );
}
