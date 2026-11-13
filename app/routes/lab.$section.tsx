import { Cache, getSupportedLocales } from "@shopify/hydrogen";
import type { Route } from "./+types/lab.$section";
import { FeatureDemo } from "~/components/lab/demos";
import { CodeBlock } from "~/components/lab/code-block";
import { findSection, SECTIONS, STATUS_META } from "~/lib/lab/features";
import { LAB_PRICE_QUERY, LAB_TIMING_QUERY } from "~/lib/queries/lab.server";
import { shopifyContext } from "~/lib/shopify/context";
import { getEnv, getPublicRuntime } from "~/lib/shopify/env.server";
import { i18n } from "~/lib/shopify/i18n";
import { createStorefrontForLocale } from "~/lib/shopify/middleware.server";
import { Link } from "~/lib/storefront/locale";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const section = findSection(params.section);
  if (!section) throw new Response("Lab section not found", { status: 404 });
  const { storefront, customer, requestContext } = context.get(shopifyContext);
  const origin = new URL(request.url).origin;
  const env = getEnv();
  const server: Record<string, unknown> = { runtime: getPublicRuntime(), locale: requestContext.locale };

  if (section.slug === "markets") {
    server.markets = await Promise.all(
      getSupportedLocales(i18n).map(async (locale) => {
        const client = createStorefrontForLocale(locale, origin);
        const { data } = await client.graphql(LAB_PRICE_QUERY, { variables: { handle: "halo-anc-headphones" } });
        return {
          country: locale.country,
          language: locale.language,
          intlLocale: (locale as { intlLocale?: string }).intlLocale ?? "en-US",
          label: (locale as { label?: string }).label ?? locale.country,
          price: data?.product?.priceRange.minVariantPrice ?? null,
          currencyName: data?.localization.country.currency.isoCode ?? null,
          pathPrefix: client.locale.pathPrefix,
        };
      }),
    );
  }
  if (section.slug === "customer-accounts") {
    server.account = { mode: customer.mode, loggedIn: await customer.isLoggedIn(), shopIdConfigured: Boolean(env.shopId), clientIdConfigured: Boolean(env.customerAccountClientId) };
  }
  if (section.slug === "performance") {
    const t0 = performance.now();
    await storefront.graphql(LAB_TIMING_QUERY);
    server.timing = Math.round(performance.now() - t0);
    server.strategies = { "Cache.long()": Cache.long(), "Cache.short()": Cache.short(), "Cache.none()": Cache.none() };
    // Streams after the shell: resolves ~1.2s later on the server.
    server.slow = new Promise<{ resolvedAt: string }>((resolve) => setTimeout(() => resolve({ resolvedAt: new Date().toISOString() }), 1200));
  }
  if (section.slug === "oxygen") {
    server.oxygen = {
      node: typeof process !== "undefined" ? process.version : "worker",
      hasCacheStorage: typeof caches !== "undefined",
      runtime: typeof navigator !== "undefined" && "userAgent" in navigator ? navigator.userAgent : "unknown",
      envKeys: ["DEMO_MODE", "PUBLIC_STORE_DOMAIN", "PUBLIC_STOREFRONT_API_TOKEN", "PRIVATE_STOREFRONT_API_TOKEN", "PUBLIC_STOREFRONT_ID", "SHOP_ID", "PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID", "CUSTOMER_ACCOUNT_SESSION_SECRET"].map((k) => ({ key: k, set: Boolean(process.env[k]) })),
    };
  }
  return { slug: section.slug, server };
}

export const meta: Route.MetaFunction = ({ params }) => [{ title: `${findSection(params.section)?.title ?? "Lab"} · Hydrogen Lab | NOVA` }, { name: "robots", content: "noindex" }];

/** Renders `backtick` spans in lab copy as inline code. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/g).map((part, i) => (part.startsWith("`") ? <code key={i} className="code-inline">{part.slice(1, -1)}</code> : part))}</>;
}

export default function LabSection({ loaderData }: Route.ComponentProps) {
  const section = findSection(loaderData.slug)!;
  const index = SECTIONS.indexOf(section);
  const next = SECTIONS[index + 1];
  return (
    <article>
      <header className="mb-14 border-b border-line pb-10">
        <p className="eyebrow mb-3">Section {section.letter}</p>
        <h1 className="display text-display-sm">{section.title}</h1>
        <p className="mt-5 max-w-3xl text-[1.0625rem] leading-relaxed text-graphite"><Rich text={section.intro} /></p>
      </header>
      <div className="space-y-20">
        {section.features.map((f) => (
          <section key={f.id} id={f.id} className="scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-medium tracking-tight">{f.title}</h2>
                <p className="mt-2 leading-relaxed text-graphite"><Rich text={f.summary} /></p>
              </div>
              <div className="flex flex-wrap gap-1.5">{f.status.map((s) => <span key={s} className={`status ${STATUS_META[s].className}`} title={STATUS_META[s].description}>{STATUS_META[s].label}</span>)}</div>
            </div>
            <dl className="mb-6 grid gap-x-8 gap-y-3 text-[0.8125rem] md:grid-cols-3">
              <div><dt className="text-stone">Hydrogen API</dt><dd className="mt-1 flex flex-wrap gap-1">{f.api.map((a) => <code key={a} className="code-inline">{a}</code>)}</dd></div>
              <div><dt className="text-stone">Data</dt><dd className="mt-1">{f.data}</dd></div>
              <div>
                <dt className="text-stone">Docs</dt>
                <dd className="mt-1 break-all">{f.docs.startsWith("http") ? <a href={f.docs} target="_blank" rel="noreferrer" className="underline underline-offset-4">{f.docs.replace("https://", "")}</a> : <code className="code-inline">{f.docs}</code>}</dd>
              </div>
            </dl>
            {f.demo ? <div className="mb-6 border border-line bg-paper p-5 md:p-6"><FeatureDemo name={f.demo} server={loaderData.server} /></div> : null}
            {f.code ? <CodeBlock code={f.code} /> : null}
            {f.where?.length ? (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-[0.8125rem]">
                <span className="text-stone">See it in the store:</span>
                {f.where.map((w) => (w.to.endsWith(".txt") || w.to.endsWith(".xml") ? <a key={w.to} href={w.to} className="chip">{w.label}</a> : <Link key={w.to} to={w.to} className="chip">{w.label}</Link>))}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      {next ? (
        <Link to={`/lab/${next.slug}`} className="mt-20 flex items-center justify-between border-t border-line pt-8 text-lg hover:text-ember">
          <span><span className="eyebrow block">Next · {next.letter}</span>{next.title}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}
