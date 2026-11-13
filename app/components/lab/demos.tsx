/**
 * Interactive Hydrogen Lab demos. Each one exercises real Hydrogen APIs in the
 * browser or via same-origin endpoints; nothing here fakes a result.
 */
import {
  buildProductSelectionSearchParams,
  canAddToCart,
  formatMoney,
  getPredictiveSearchItemUrl,
  getSortByValue,
  parseCollectionParams,
  serializeCollectionParams,
  type MoneyV2,
} from "@shopify/hydrogen";
import { PredictiveSearchProvider, ShopPayButton, usePredictiveSearch, usePredictiveSearchForm } from "@shopify/hydrogen/react";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Await, useFetcher } from "react-router";
import { ProductFormProvider } from "~/components/product/product-form";
import type { ProductData } from "~/lib/queries/product.server";
import { routeTemplates } from "~/lib/shopify/routes";
import { ANALYTICS_EVENT, AnalyticsEvent, getAnalytics, inspectedEvents, type InspectedEvent } from "~/lib/storefront/analytics";
import { useCart, useCartActions } from "~/lib/storefront/cart";
import { chooseConsent, consentStatus, onConsentStatus, readConsent, resetConsent } from "~/lib/storefront/consent";
import { Link, useLocale, useLocalizedPath } from "~/lib/storefront/locale";
import { useProductForm } from "~/lib/storefront/product";
import { shopifyImageUrl } from "~/lib/storefront/image";
import { CodeBlock } from "./code-block";

type Server = Record<string, unknown>;

const Json = ({ value, max = 3500 }: { value: unknown; max?: number }) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre className="code-block max-h-96 text-[0.72rem]">{text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters)` : text}</pre>;
};
const Btn = ({ children, onClick, disabled, active }: { children: ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}>{children}</button>
);

export function FeatureDemo({ name, server }: { name: string; server: Server }) {
  switch (name) {
    case "graphql-explorer": return <GraphqlExplorer />;
    case "request-probe": return <RequestProbe />;
    case "variant-store": return <VariantStore />;
    case "browse-params": return <BrowseParams />;
    case "cart-inspector": return <CartInspector />;
    case "predictive-search": return <PredictivePlayground />;
    case "account-status": return <AccountStatus account={server.account as AccountInfo} />;
    case "markets": return <Markets rows={server.markets as MarketRow[]} />;
    case "format-money": return <FormatMoney />;
    case "analytics": return <AnalyticsLog />;
    case "shop-pay": return <ShopPayDemo />;
    case "cache-strategies": return <CacheDemo server={server} />;
    case "streaming": return <StreamingDemo slow={server.slow as Promise<{ resolvedAt: string }>} />;
    case "images": return <ImagesDemo />;
    case "seo": return <SeoDemo />;
    case "oxygen": return <OxygenDemo info={server.oxygen as OxygenInfo} />;
    case "mcp-console": return <McpConsole />;
    case "agent": return <AgentDemo />;
    default: return null;
  }
}

// --- A. GraphQL explorer ---------------------------------------------------

const PRESETS: Record<string, string> = {
  Shop: `{
  shop { name description paymentSettings { currencyCode acceptedCardBrands } }
  localization { country { isoCode currency { isoCode } } language { isoCode } }
}`,
  Product: `query ($handle: String!) {
  product(handle: $handle) {
    title encodedVariantExistence encodedVariantAvailability
    options { name optionValues { name swatch { color } } }
    selectedOrFirstAvailableVariant(selectedOptions: [{ name: "Color", value: "Cognac" }]) {
      title availableForSale quantityAvailable price { amount currencyCode }
    }
  }
}`,
  "Collection + filters": `{
  collection(handle: "desk") {
    title
    products(first: 4, sortKey: PRICE, reverse: true, filters: [{ available: true }]) {
      nodes { title priceRange { minVariantPrice { amount } } }
      filters { label type values { label count input } }
    }
  }
}`,
  Search: `{
  search(query: "walnut", first: 5, types: [PRODUCT]) {
    totalCount
    nodes { ... on Product { title productType } }
  }
}`,
  "Invalid field": `{
  shop { nme }
}`,
};

function GraphqlExplorer() {
  const [query, setQuery] = useState(PRESETS.Shop);
  const [result, setResult] = useState<{ status: number; ms: number; body: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const t0 = performance.now();
    const res = await fetch("/api/2026-10/graphql.json", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables: { handle: "halo-anc-headphones" } }) });
    setResult({ status: res.status, ms: Math.round(performance.now() - t0), body: await res.json().catch(() => "Non-JSON response") });
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{Object.keys(PRESETS).map((k) => <Btn key={k} active={PRESETS[k] === query} onClick={() => setQuery(PRESETS[k])}>{k}</Btn>)}</div>
      <label className="sr-only" htmlFor="gql-q">GraphQL query</label>
      <textarea id="gql-q" value={query} onChange={(e) => setQuery(e.currentTarget.value)} rows={9} spellCheck={false} className="code-block w-full resize-y outline-none" />
      <div className="flex items-center gap-4">
        <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={busy}>{busy ? "Running…" : "Run query"}</button>
        <span className="text-[0.8125rem] text-stone">POST /api/2026-10/graphql.json (SFAPI proxy) · variables: {"{ handle: \"halo-anc-headphones\" }"}</span>
      </div>
      {result ? <><p className="text-[0.8125rem]">HTTP {result.status} · {result.ms} ms</p><Json value={result.body} /></> : null}
    </div>
  );
}

// --- B. Request handler probe ----------------------------------------------

const PROBES = [
  { label: "GET /api/cart", path: "/api/cart", note: "Cart handler JSON ({cart: null} without a cart cookie)" },
  { label: "GET /api/predictive-search", path: "/api/predictive-search?q=lamp&limit=3", note: "Predictive search handler" },
  { label: "POST SFAPI proxy", path: "/api/2026-10/graphql.json", method: "POST", body: JSON.stringify({ query: "{ shop { name } }" }), note: "Same-origin Storefront API proxy" },
  { label: "GET /checkout", path: "/checkout", note: "302 → cart.checkoutUrl (needs a cart)" },
  { label: "?variant= redirect", path: "/products/halo-anc-headphones?variant=48800000103", note: "302 → canonical option params via routeTemplates" },
  { label: "GET /admin", path: "/admin", note: "Live: redirect to Shopify Admin. Demo: explained locally" },
  { label: "Cart permalink", path: "/cart/48800001500:1", note: "Live: store permalink. Demo: mock cart + cart cookie → checkout" },
  { label: "/.well-known/ucp", path: "/.well-known/ucp", note: "Live: Shopify UCP profile proxy. Demo: simulated profile" },
  { label: "GET /robots.txt", path: "/robots.txt", note: "App-owned robots route" },
  { label: "Unknown path", path: "/this/does-not-exist", note: "Router 404 → handleShopifyRedirects → 404" },
];

function RequestProbe() {
  const fetcher = useFetcher<{ status: number; ms: number; headers: Record<string, string>; body: string; error?: string }>();
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {PROBES.map((p) => (
          <li key={p.label}>
            <button
              type="button"
              onClick={() => {
                setActive(p.label);
                const qs = new URLSearchParams({ path: p.path, ...(p.method ? { method: p.method, body: p.body ?? "" } : {}) });
                void fetcher.load(`/lab-probe?${qs}`);
              }}
              className={`w-full border p-3 text-left text-sm transition hover:border-ink ${active === p.label ? "border-ink bg-bone" : "border-line"}`}
            >
              <span className="font-mono text-[0.8125rem]">{p.label}</span>
              <span className="block text-[0.75rem] text-stone">{p.note}</span>
            </button>
          </li>
        ))}
      </ul>
      {fetcher.state !== "idle" ? <p className="text-sm text-stone">Requesting…</p> : null}
      {fetcher.data && fetcher.state === "idle" ? (
        <div className="space-y-2">
          <p className="text-sm"><strong className="font-medium">HTTP {fetcher.data.status}</strong> · {fetcher.data.ms} ms</p>
          <Json value={fetcher.data.headers} />
          {fetcher.data.body ? <Json value={fetcher.data.body} max={1200} /> : null}
        </div>
      ) : null}
    </div>
  );
}

// --- C. Product form store -------------------------------------------------

function VariantStore() {
  const fetcher = useFetcher<{ product: ProductData | null }>();
  const { load } = fetcher;
  useEffect(() => void load("/quick-view?handle=keyframe-75-keyboard"), [load]);
  const product = fetcher.data?.product;
  if (!product) return <p className="text-sm text-stone">Loading product…</p>;
  return (
    <ProductFormProvider product={product} syncUrl={false}>
      <VariantStoreView product={product} />
    </ProductFormProvider>
  );
}

function VariantStoreView({ product }: { product: ProductData }) {
  const { options, selectedVariant, register } = useProductForm();
  const selectedOptions = options.flatMap((o) => o.values.filter((v) => v.selected).map((v) => ({ name: o.name, value: v.name })));
  const params = buildProductSelectionSearchParams({ selectedOptions, optionNames: product.options.map((o) => o.name), base: new URLSearchParams("ref=lab") });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        {options.map((o) => (
          <div key={o.name}>
            <p className="mb-2 text-sm font-medium">{o.name}</p>
            <div className="flex flex-wrap gap-2">
              {o.values.map((v) => (
                <button key={v.name} type="button" disabled={!v.exists} aria-pressed={v.selected} onClick={() => register("optionValue", { optionName: o.name, value: v.name }).onClick()} className={`chip ${v.selected ? "border-ink bg-ink text-paper" : ""} ${!v.exists ? "opacity-30" : ""} ${!v.available && v.exists ? "line-through" : ""}`}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <table className="w-full text-left text-[0.8125rem]">
          <thead className="text-stone"><tr><th className="font-normal">Value</th><th className="font-normal">exists</th><th className="font-normal">available</th><th className="font-normal">selected</th></tr></thead>
          <tbody>
            {options.flatMap((o) => o.values.map((v) => (
              <tr key={o.name + v.name} className="border-t border-line">
                <td className="py-1">{o.name}: {v.name}</td>
                <td className={v.exists ? "text-moss" : "text-danger"}>{String(v.exists)}</td>
                <td className={v.available ? "text-moss" : "text-stone"}>{String(v.available)}</td>
                <td>{v.selected ? "●" : ""}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <Json value={{ selectedVariant: selectedVariant ? { title: selectedVariant.title, availableForSale: selectedVariant.availableForSale, price: selectedVariant.price } : null, canAddToCart: canAddToCart(product, options), url: `/products/${product.handle}?${params}`, encodedVariantExistence: product.encodedVariantExistence, encodedVariantAvailability: product.encodedVariantAvailability }} />
    </div>
  );
}

function BrowseParams() {
  const [qs, setQs] = useState("filter.v.availability=1&filter.p.product_type=Lamps&filter.v.price.gte=50&filter.v.price.lte=200&sort_by=price-descending&q=lamp");
  const parsed = useMemo(() => parseCollectionParams(new URLSearchParams(qs)), [qs]);
  return (
    <div className="space-y-4">
      <label htmlFor="bp" className="field-label">URL search params</label>
      <input id="bp" value={qs} onChange={(e) => setQs(e.currentTarget.value)} className="input font-mono text-[0.8125rem]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div><p className="mb-2 text-[0.8125rem] text-stone">parseCollectionParams(): Storefront API variables</p><Json value={parsed} /></div>
        <div>
          <p className="mb-2 text-[0.8125rem] text-stone">serializeCollectionParams() round trip + getSortByValue()</p>
          <Json value={{ serialized: serializeCollectionParams(parsed).toString(), "getSortByValue('BEST_SELLING')": getSortByValue("BEST_SELLING", false), "getSortByValue('PRICE', true)": getSortByValue("PRICE", true) }} />
        </div>
      </div>
    </div>
  );
}

// --- D. Cart inspector ------------------------------------------------------

function CartInspector() {
  const data = useCart((s) => s.data);
  const pending = useCart((s) => s.pending);
  const loading = useCart((s) => s.loading);
  const revalidating = useCart((s) => s.revalidating);
  const errors = useCart((s) => s.errors);
  const { refresh } = useCartActions();
  const [log, setLog] = useState<string[]>([]);
  const note = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${m}`, ...l].slice(0, 8));
  const actions = () => window.Shopify?.actions;

  async function run(label: string, payload: Parameters<NonNullable<ReturnType<typeof actions>>["updateCart"]>[0]) {
    const a = actions();
    if (!a) return note("Standard Actions not loaded yet");
    note(`→ updateCart ${label}`);
    try {
      const r = await a.updateCart(payload);
      note(`← ${label}: ${r.cart.totalQuantity} items${r.userErrors?.length ? ` · ${r.userErrors[0].message}` : ""}${r.warnings?.length ? ` · ${r.warnings[0].message}` : ""}`);
    } catch (e) {
      note(`✕ ${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => run("add sample lines", { lines: [{ merchandiseId: "gid://shopify/ProductVariant/48800000100", quantity: 1 }, { merchandiseId: "gid://shopify/ProductVariant/48800002300", quantity: 2 }] })}>Add sample lines</Btn>
          <Btn onClick={() => run("sold-out variant", { lines: [{ merchandiseId: "gid://shopify/ProductVariant/48800000102", quantity: 1 }] })}>Add sold-out (warning)</Btn>
          <Btn onClick={() => run("discount WELCOME10", { discountCodes: ["WELCOME10"] })}>Apply WELCOME10</Btn>
          <Btn onClick={() => run("note", { note: `Lab note ${new Date().toLocaleTimeString()}` })}>Set note</Btn>
          <Btn onClick={() => void actions()?.openCart()}>openCart()</Btn>
          <Btn onClick={() => { refresh(); note("refresh() requested"); }}>refresh()</Btn>
          <Btn
            onClick={async () => {
              for (const line of data.lines.nodes) await run("remove line", { lines: [{ id: line.id, quantity: 0 }] });
            }}
          >
            Clear cart
          </Btn>
        </div>
        <ul className="space-y-1 font-mono text-[0.75rem] text-graphite">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </div>
      <Json
        value={{
          loading,
          revalidating,
          pending: { lines: [...pending.lines], discountCodes: [...pending.discountCodes], cost: pending.cost, note: pending.note, attributes: pending.attributes },
          errors: { network: errors.network.map((e) => e.message), cart: errors.cart.userErrors.map((e) => e.message), lines: [...errors.lines.values()].flatMap((g) => [...g.userErrors, ...g.warnings].map((e) => e.message)) },
          data: { id: data.id, totalQuantity: data.totalQuantity, cost: data.cost, discountCodes: data.discountCodes, note: data.note, lines: data.lines.nodes.map((l) => ({ id: l.id.slice(0, 40) + "…", quantity: l.quantity, title: l.merchandise?.product?.title, total: l.cost?.totalAmount })) },
        }}
      />
    </div>
  );
}

// --- E. Predictive search ----------------------------------------------------

function PredictivePlayground() {
  return (
    <PredictiveSearchProvider limit={4}>
      <PredictiveInner />
    </PredictiveSearchProvider>
  );
}

function PredictiveInner() {
  const { formProps, register } = usePredictiveSearchForm();
  const state = usePredictiveSearch();
  const { pathPrefix } = useLocale();
  const term = state.result.term;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form {...formProps({ preventDefault: true })} role="search">
        <label htmlFor="ps-lab" className="field-label">Type to search (debounced by Hydrogen)</label>
        <input {...register("query", { id: "ps-lab", placeholder: "try: wal, lamp, key" })} className="input" />
        <ul className="mt-4 space-y-1 text-[0.8125rem]">
          {state.result.items.queries.map((q) => <li key={q.text}><a className="underline" href={getPredictiveSearchItemUrl(q, { routes: routeTemplates, pathPrefix })}>{q.text}</a></li>)}
          {state.result.items.products.map((p) => <li key={p.id} className="break-all"><a className="underline" href={getPredictiveSearchItemUrl(p, { term, routes: routeTemplates, pathPrefix })}>{getPredictiveSearchItemUrl(p, { term, routes: routeTemplates, pathPrefix })}</a></li>)}
        </ul>
      </form>
      <Json value={{ status: state.status, error: state.error, term, total: state.result.total, counts: Object.fromEntries(Object.entries(state.result.items).map(([k, v]) => [k, (v as unknown[]).length])) }} />
    </div>
  );
}

// --- F. Accounts --------------------------------------------------------------

type AccountInfo = { mode: string; loggedIn: boolean; shopIdConfigured: boolean; clientIdConfigured: boolean };
function AccountStatus({ account }: { account: AccountInfo }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Json value={account} />
      <div className="space-y-3 text-sm text-graphite">
        <p>{account.mode === "demo" ? "Demo mode: /account/login renders a profile picker, and the session stores a demo customer id. The mock CAAPI derives the customer from the access token." : account.mode === "live" ? "Live mode: Hydrogen's handlers own /account/login, /authorize, /refresh and /logout." : "Live mode without SHOP_ID / PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: account handlers are not registered."}</p>
        <div className="flex flex-wrap gap-2">
          {account.loggedIn ? <Link to="/account" className="btn btn-primary btn-sm">Open account</Link> : <a href="/account/login?return_to=/lab/customer-accounts" className="btn btn-primary btn-sm">Sign in</a>}
          <Link to="/account/orders" className="btn btn-secondary btn-sm">Orders</Link>
        </div>
      </div>
    </div>
  );
}

// --- G. Markets -------------------------------------------------------------

type MarketRow = { country: string; language: string; intlLocale: string; label: string; price: MoneyV2 | null; pathPrefix: string };
function Markets({ rows }: { rows: MarketRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-[0.75rem] text-stone"><tr><th className="py-2 font-normal">Market</th><th className="font-normal">@inContext</th><th className="font-normal">API amount</th><th className="font-normal">formatMoney()</th><th className="font-normal" /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.country} className="border-t border-line">
            <td className="py-2.5">{r.label}</td>
            <td className="font-mono text-[0.75rem]">{r.country}/{r.language}</td>
            <td className="font-mono text-[0.75rem]">{r.price ? `${r.price.amount} ${r.price.currencyCode}` : "–"}</td>
            <td className="tabular-nums">{r.price ? formatMoney(r.price, { locale: r.intlLocale }).toString() : "–"}</td>
            <td><a href={`${r.pathPrefix}/products/halo-anc-headphones`} className="text-[0.8125rem] underline underline-offset-4">Open {r.pathPrefix || "/"}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FormatMoney() {
  const [amount, setAmount] = useState("1299.5");
  const [currency, setCurrency] = useState("EUR");
  const [locale, setLocale] = useState("fr-FR");
  let out: Record<string, unknown>;
  try {
    const f = formatMoney({ amount, currencyCode: currency as MoneyV2["currencyCode"] }, { locale });
    out = { toString: f.toString(), amount: f.amount, currencySymbol: f.currencySymbol, currencyNarrowSymbol: f.currencyNarrowSymbol, currencyName: f.currencyName, withoutTrailingZeros: f.withoutTrailingZeros, withoutTrailingZerosAndCurrency: f.withoutTrailingZerosAndCurrency };
  } catch (e) {
    out = { error: String(e) };
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <div><label htmlFor="fm-a" className="field-label">Amount</label><input id="fm-a" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} className="input" /></div>
        <div><label htmlFor="fm-c" className="field-label">Currency</label><select id="fm-c" value={currency} onChange={(e) => setCurrency(e.currentTarget.value)} className="input">{["USD", "CAD", "GBP", "EUR", "AUD", "JPY", "CHF", "INR"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label htmlFor="fm-l" className="field-label">Locale</label><select id="fm-l" value={locale} onChange={(e) => setLocale(e.currentTarget.value)} className="input">{["en-US", "en-CA", "fr-CA", "en-GB", "fr-FR", "de-DE", "ja-JP", "en-IN"].map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <Json value={out} />
    </div>
  );
}

// --- H. Analytics -------------------------------------------------------------

function AnalyticsLog() {
  const [events, setEvents] = useState<InspectedEvent[]>([]);
  const [status, setStatus] = useState({ ...consentStatus, stored: null as string | null, allowed: "…" });
  useEffect(() => {
    setEvents([...inspectedEvents]);
    const read = () => setStatus({ ...consentStatus, stored: readConsent(), allowed: String(window.Shopify?.customerPrivacy?.analyticsProcessingAllowed?.() ?? "n/a") });
    read();
    const onEvent = () => {
      setEvents([...inspectedEvents]);
      read();
    };
    window.addEventListener(ANALYTICS_EVENT, onEvent);
    const off = onConsentStatus(read);
    return () => {
      window.removeEventListener(ANALYTICS_EVENT, onEvent);
      off();
    };
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Consent: <strong className="font-medium">{status.stored ?? "not chosen"}</strong> · sync: {status.phase}{status.error ? ` (${status.error})` : ""} · analyticsProcessingAllowed: {status.allowed}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => chooseConsent("accepted")}>Accept</Btn>
        <Btn onClick={() => chooseConsent("rejected")}>Decline</Btn>
        <Btn onClick={() => { resetConsent(); location.reload(); }}>Reset &amp; reload</Btn>
        <Btn onClick={() => getAnalytics()?.publish(AnalyticsEvent.PAGE_VIEWED)}>Publish PAGE_VIEWED</Btn>
        <Btn onClick={() => getAnalytics()?.publish(AnalyticsEvent.SEARCH_VIEWED, { searchTerm: "lab", searchResults: { totalCount: 0 } })}>Publish SEARCH_VIEWED</Btn>
      </div>
      <p className="text-[0.8125rem] text-stone">Declining stops delivery: the bus clears its buffer and the inspector receives nothing until you accept. Add something to the bag to see cart delta events from useCartAnalytics().</p>
      <ul className="max-h-96 divide-y divide-line overflow-y-auto border-y border-line text-[0.8125rem]">
        {events.length ? events.map((e) => (
          <li key={e.id} className="grid grid-cols-[6rem_11rem_1fr] gap-3 py-2">
            <span className="text-stone tabular-nums">{new Date(e.at).toLocaleTimeString()}</span>
            <span className="font-mono">{e.name}</span>
            <span className="truncate font-mono text-[0.7rem] text-stone">{JSON.stringify(e.payload).slice(0, 160)}</span>
          </li>
        )) : <li className="py-4 text-stone">No events delivered yet{status.stored === "rejected" ? " (consent declined)" : ""}.</li>}
      </ul>
    </div>
  );
}

// --- I. Shop Pay --------------------------------------------------------------

function ShopPayDemo() {
  const [qty, setQty] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const [hrefs, setHrefs] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      const anchors = [...(ref.current?.querySelectorAll("hydrogen-shop-pay-button") ?? [])].map((el) => el.shadowRoot?.querySelector("a")?.getAttribute("href") ?? "(disabled: no href)");
      setHrefs(anchors);
    }, 200);
    return () => clearTimeout(t);
  }, [qty]);
  return (
    <div ref={ref} className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm font-medium">Product mode: Halo (Graphite) × {qty}</p>
        <div className="flex gap-2">{[1, 2, 3].map((n) => <Btn key={n} active={qty === n} onClick={() => setQty(n)}>{n}</Btn>)}</div>
        <ShopPayButton variants={[{ id: "gid://shopify/ProductVariant/48800000100", quantity: qty }]} width="100%" borderRadius="999px" />
        <p className="text-sm font-medium">Cart mode (no variants)</p>
        <ShopPayButton width="100%" borderRadius="4px" />
        <p className="text-sm font-medium">Disabled</p>
        <ShopPayButton disabled width="100%" borderRadius="4px" />
      </div>
      <div className="space-y-3">
        <p className="text-[0.8125rem] text-stone">Generated links (read from each button's shadow root):</p>
        <Json value={hrefs} />
        <p className="text-[0.8125rem] text-graphite">Product mode links to a same-origin cart permalink; cart mode links to <code className="code-inline">/checkout</code>. Both are resolved by handleShopifyRoutes. In demo mode, /checkout reaches the demo checkout page. Cart permalinks and real Shop Pay need a store.</p>
      </div>
    </div>
  );
}

// --- J. Performance ------------------------------------------------------------

function CacheDemo({ server }: { server: Server }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div><p className="mb-2 text-[0.8125rem] text-stone">Strategy objects (Cache-Control semantics)</p><Json value={server.strategies} /></div>
      <div className="space-y-3 text-sm text-graphite">
        <p>Uncached Storefront API round trip just now: <strong className="font-medium text-ink">{String(server.timing)} ms</strong> (mock API adds {"MOCK_API_QUERY_LATENCY_MS"} of simulated latency).</p>
        <p>On Oxygen, pass <code className="code-inline">cache</code> + <code className="code-inline">waitUntil</code> to <code className="code-inline">createStorefrontClient</code>, then opt in per query. Hydrogen never caches mutations, GraphQL errors, or responses marked private, and cart/customer reads must never pass a strategy.</p>
      </div>
    </div>
  );
}

function StreamingDemo({ slow }: { slow: Promise<{ resolvedAt: string }> }) {
  const [renderedAt] = useState(() => new Date().toISOString());
  return (
    <div className="space-y-3 text-sm">
      <p>Shell rendered at <span className="font-mono">{renderedAt}</span></p>
      <Suspense fallback={<p className="skeleton h-6 w-72" role="status" aria-label="Streaming" />}>
        <Await resolve={slow}>{(v) => <p className="text-moss">Deferred loader data streamed in at <span className="font-mono">{v.resolvedAt}</span> (≈1.2 s after the loader started).</p>}</Await>
      </Suspense>
      <CodeBlock code={`export async function loader() {
  return { critical: await getCritical(), slow: getSlowThing() /* not awaited */ };
}
<Suspense fallback={<Skeleton />}><Await resolve={slow}>{(v) => …}</Await></Suspense>`} />
    </div>
  );
}

function ImagesDemo() {
  const src = "https://cdn.shopify.com/s/files/1/0926/5994/1398/files/16404741b926c45969c5395c196b3ce3.png?v=13028826";
  const widths = [120, 320, 640];
  const [sizes, setSizes] = useState<Record<number, number>>({});
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {widths.map((w) => {
          const url = shopifyImageUrl(src, { width: w, height: Math.round(w * 1.25), crop: "center" });
          return (
            <figure key={w} className="space-y-1">
              <img
                src={url}
                width={w / 2}
                height={(w * 1.25) / 2}
                alt={`Halo headphones at ${w}px`}
                className="bg-bone"
                onLoad={() => {
                  const entry = performance.getEntriesByName(url)[0] as PerformanceResourceTiming | undefined;
                  if (entry) setSizes((s) => ({ ...s, [w]: entry.encodedBodySize || entry.transferSize }));
                }}
              />
              <figcaption className="text-[0.75rem] text-stone">{w}px · {sizes[w] ? `${Math.round(sizes[w] / 1024)} KB` : "cross-origin size n/a"}</figcaption>
            </figure>
          );
        })}
      </div>
      <Json value={widths.map((w) => shopifyImageUrl(src, { width: w, height: Math.round(w * 1.25), crop: "center" }))} />
    </div>
  );
}

// --- K. SEO ---------------------------------------------------------------------

function SeoDemo() {
  const fetcher = useFetcher<{ status: number; seo: unknown }>();
  const pages = ["/", "/products/halo-anc-headphones", "/collections/desk", "/blogs/journal/the-quiet-desk"];
  const [path, setPath] = useState(pages[1]);
  const { load } = fetcher;
  useEffect(() => void load(`/lab-probe?mode=seo&path=${encodeURIComponent(path)}`), [path, load]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{pages.map((p) => <Btn key={p} active={p === path} onClick={() => setPath(p)}>{p}</Btn>)}</div>
      {fetcher.data ? <Json value={fetcher.data.seo} max={5000} /> : <p className="text-sm text-stone">Fetching server-rendered HTML…</p>}
    </div>
  );
}

// --- L. Oxygen ---------------------------------------------------------------------

type OxygenInfo = { node: string; hasCacheStorage: boolean; runtime: string; envKeys: { key: string; set: boolean }[] };
function OxygenDemo({ info }: { info: OxygenInfo }) {
  const checks = [
    ["Web Request/Response in every request path", true],
    ["No Node-only APIs (fs, Buffer, process) in middleware, handlers or mock API request paths", true],
    ["Environment read in one server module (env.server.ts)", true],
    ["Per-request Storefront client + request context", true],
    ["Module-scope handler groups and i18n/route templates (define*)", true],
    ["Worker entry (server.ts) + MiniOxygen via @shopify/hydrogen/vite", false],
    ["CacheStorage + waitUntil passed to createStorefrontClient", false],
    ["Mock carts in memory → per-isolate on workers (use DEMO_MODE=false in production)", false],
  ] as const;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ul className="space-y-2 text-sm">
        {checks.map(([label, ok]) => <li key={label} className="flex gap-2.5"><span className={ok ? "text-moss" : "text-amber"}>{ok ? "✓" : "○"}</span>{label}</li>)}
      </ul>
      <Json value={info} />
    </div>
  );
}

// --- M. Agentic ----------------------------------------------------------------------

const MCP_PRESETS: Record<string, object> = {
  "tools/list": { jsonrpc: "2.0", id: 1, method: "tools/list" },
  search_shop_catalog: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_shop_catalog", arguments: { query: "headphones" } } },
  get_product_details: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_product_details", arguments: { product_handle: "arc-laptop-stand" } } },
  search_shop_policies_and_faqs: { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search_shop_policies_and_faqs", arguments: { query: "how long do returns take" } } },
  update_cart: { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "update_cart", arguments: { add_items: [{ product_variant_id: "gid://shopify/ProductVariant/48800003300", quantity: 1 }] } } },
};

async function mcp(body: object) {
  const res = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json() as Promise<{ result?: { structuredContent?: unknown; tools?: unknown }; error?: { message: string } }>;
}

function McpConsole() {
  const [request, setRequest] = useState(JSON.stringify(MCP_PRESETS["tools/list"], null, 2));
  const [response, setResponse] = useState<unknown>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{Object.entries(MCP_PRESETS).map(([k, v]) => <Btn key={k} onClick={() => setRequest(JSON.stringify(v, null, 2))}>{k}</Btn>)}</div>
      <textarea value={request} onChange={(e) => setRequest(e.currentTarget.value)} rows={8} aria-label="JSON-RPC request" spellCheck={false} className="code-block w-full resize-y outline-none" />
      <button type="button" className="btn btn-primary btn-sm" onClick={async () => { try { setResponse(await mcp(JSON.parse(request))); } catch (e) { setResponse(String(e)); } }}>Send to /api/mcp</button>
      {response ? <Json value={response} /> : null}
    </div>
  );
}

type Step = { tool: string; detail: string; ok: boolean };
type SearchHit = { handle: string; title: string; availableForSale: boolean; priceRange: { minVariantPrice: MoneyV2 } };

function AgentDemo() {
  const [prompt, setPrompt] = useState("Quiet headphones for travel under $320");
  const [steps, setSteps] = useState<Step[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localize = useLocalizedPath();

  async function runAgent() {
    setBusy(true);
    setSteps([]);
    setCheckoutUrl(null);
    const push = (s: Step) => setSteps((x) => [...x, s]);
    const budget = Number(/\$?\s?(\d+(?:\.\d+)?)/.exec(prompt.replace(/,/g, ""))?.[1] ?? Infinity);
    const stop = new Set(["for", "under", "below", "a", "an", "the", "with", "and", "my", "i", "need", "want", "some", "less", "than", "travel", "quiet"]);
    const keyword = prompt.toLowerCase().replace(/\$?\d+/g, "").split(/\W+/).filter((w) => w.length > 2 && !stop.has(w))[0] ?? prompt;
    push({ tool: "plan", detail: `keyword “${keyword}”, budget ${Number.isFinite(budget) ? budget : "none"}`, ok: true });
    const search = await mcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_shop_catalog", arguments: { query: keyword } } });
    const hits = ((search.result?.structuredContent as { nodes?: SearchHit[] })?.nodes ?? []).filter((n) => n.availableForSale);
    push({ tool: "search_shop_catalog", detail: `${hits.length} available results: ${hits.map((h) => h.title).join(", ") || "none"}`, ok: hits.length > 0 });
    const pick = hits.find((h) => Number(h.priceRange.minVariantPrice.amount) <= budget);
    if (!pick) {
      push({ tool: "decide", detail: "Nothing matches within budget; ask the shopper to adjust.", ok: false });
      return setBusy(false);
    }
    const details = await mcp({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_product_details", arguments: { product_handle: pick.handle } } });
    const variants = ((details.result?.structuredContent as { variants?: { nodes: { id: string; title: string; availableForSale: boolean; price: MoneyV2 }[] } })?.variants?.nodes ?? []).filter((v) => v.availableForSale && Number(v.price.amount) <= budget);
    const variant = variants[0];
    push({ tool: "get_product_details", detail: variant ? `${pick.title}: chose “${variant.title}” at ${formatMoney(variant.price, { locale: "en-US" })}` : "No in-budget variant", ok: Boolean(variant) });
    if (!variant) return setBusy(false);
    const cart = await mcp({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "update_cart", arguments: { add_items: [{ product_variant_id: variant.id, quantity: 1 }] } } });
    const created = (cart.result?.structuredContent as { cart?: { checkoutUrl: string; totalQuantity: number } })?.cart;
    push({ tool: "update_cart", detail: created ? `Agent cart created (${created.totalQuantity} item)` : "Cart creation failed", ok: Boolean(created) });
    setCheckoutUrl(created?.checkoutUrl ?? null);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-[0.8125rem] text-stone">Deterministic demo agent: simple rules choose the tool calls, so every step is reproducible. An LLM agent would call the same MCP tools.</p>
      <div className="flex flex-wrap gap-3">
        <label htmlFor="agent-prompt" className="sr-only">Shopping request</label>
        <input id="agent-prompt" value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} className="input min-w-64 flex-1" />
        <button type="button" className="btn btn-primary btn-sm" onClick={runAgent} disabled={busy}>{busy ? "Working…" : "Run agent"}</button>
      </div>
      <div className="flex flex-wrap gap-2 text-[0.75rem]">{["Walnut desk organizer under $200", "A lamp under 100", "Studio microphone under $600", "Cable under 20"].map((p) => <button key={p} type="button" className="chip" onClick={() => setPrompt(p)}>{p}</button>)}</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_12rem_1fr] gap-3 text-sm">
            <span className={s.ok ? "text-moss" : "text-danger"}>{s.ok ? "✓" : "✕"}</span>
            <span className="font-mono text-[0.8125rem]">{s.tool}</span>
            <span className="text-graphite">{s.detail}</span>
          </li>
        ))}
      </ol>
      {checkoutUrl ? <p className="text-sm">Agent's checkout link: <a href={checkoutUrl} className="underline">{checkoutUrl}</a> · <Link to={localize("/cart")} className="underline">your own bag</Link> is separate (agents get their own cart).</p> : null}
    </div>
  );
}
