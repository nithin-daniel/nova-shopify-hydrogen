import { getLocalizedHref, getSupportedLocales, type ShopifyScriptsI18n, type ShopifyScriptsShop } from "@shopify/hydrogen";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { AnalyticsTracker } from "~/components/analytics";
import { CartDrawer } from "~/components/cart/cart-drawer";
import { ConsentBanner } from "~/components/consent-banner";
import { DemoBadge } from "~/components/demo-badge";
import { SearchOverlay } from "~/components/search/search-overlay";
import { SiteFooter } from "~/components/layout/site-footer";
import { SiteHeader } from "~/components/layout/site-header";
import { StorefrontScripts, type ScriptsConfig } from "~/components/storefront-scripts";
import { LAYOUT_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";
import { getEnv, getPublicRuntime } from "~/lib/shopify/env.server";
import { cartHandlers } from "~/lib/shopify/handlers.server";
import { i18n, type AppLocale } from "~/lib/shopify/i18n";
import { shopifyMiddleware } from "~/lib/shopify/middleware.server";
import { installInspectorDestination } from "~/lib/storefront/analytics";
import { CartProvider } from "~/lib/storefront/cart";
import { Link } from "~/lib/storefront/locale";
import { useRootData } from "~/lib/storefront/root-data";
import { QuickView } from "~/components/product/quick-view";

export const middleware: Route.MiddlewareFunction[] = [shopifyMiddleware];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "preconnect", href: "https://cdn.shopify.com" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
  },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  const { storefront, requestContext, customer } = context.get(shopifyContext);
  const env = getEnv();
  const url = new URL(request.url);
  const matched = requestContext.locale as typeof requestContext.locale & Partial<AppLocale>;
  const locale: AppLocale = {
    language: matched.language,
    country: matched.country,
    pathPrefix: matched.pathPrefix,
    label: matched.label ?? matched.country,
    currency: matched.currency ?? "USD",
    intlLocale: matched.intlLocale ?? "en-US",
  };

  // Non-blocking cart bootstrap: a promise streams into CartProvider. On /cart we
  // await it so the page is complete HTML even without JavaScript.
  const cartPromise = cartHandlers.get({ storefrontClient: storefront }).then(({ data }) => data);
  const isCartPage = /\/cart\/?$/.test(url.pathname);

  const layout = await storefront.graphql(LAYOUT_QUERY);
  if (layout.errors) console.error("[nova] layout query failed", layout.errors);

  const shop: ShopifyScriptsShop = {
    shopId: env.shopId ?? "0",
    storefrontId: env.storefrontId,
    myshopifyDomain: env.storeDomain,
  };
  const scriptsI18n: ShopifyScriptsI18n = {
    country: matched.country,
    language: matched.language,
    pathPrefix: locale.pathPrefix,
    currency: locale.currency,
  };

  const markets = getSupportedLocales(i18n).map((l) => ({
    country: l.country,
    language: l.language,
    label: (l as { label?: string }).label ?? l.country,
    currency: (l as { currency?: string }).currency ?? "",
    href: getLocalizedHref(url.pathname + url.search, { i18n, locale: l }),
  }));

  return {
    locale,
    markets,
    runtime: getPublicRuntime(),
    scripts: { shop, i18n: scriptsI18n, demoMode: env.demoMode } satisfies ScriptsConfig,
    layout: layout.data ?? null,
    cart: isCartPage ? await cartPromise : cartPromise,
    isLoggedIn: customer.isLoggedIn(),
    origin: url.origin,
  };
}


export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRootData();
  const lang = data?.locale.intlLocale.split("-")[0] ?? "en";
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf8f4" />
        <Meta />
        <Links />
        {data ? <StorefrontScripts config={data.scripts} /> : null}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function CartAnalytics() {
  useCartAnalytics();
  return null;
}

/** useCartAnalytics throws until window.Shopify.analytics exists, so mount it after hydration. */
function ClientOnlyCartAnalytics() {
  const ready = typeof window !== "undefined" && Boolean(window.Shopify?.analytics);
  return ready ? <CartAnalytics /> : null;
}

export default function App({ loaderData }: Route.ComponentProps) {
  useEffect(() => {
    installInspectorDestination();
  }, []);
  return (
    <CartProvider initialData={loaderData.cart}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
      <SearchOverlay />
      <QuickView />
      <ConsentBanner />
      <DemoBadge runtime={loaderData.runtime} />
      <AnalyticsTracker />
      <ClientOnlyCartAnalytics />
    </CartProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const location = useLocation();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? "This page drifted off." : "Something went wrong.";
  const detail = is404
    ? "The page you're looking for doesn't exist or has moved."
    : isRouteErrorResponse(error)
      ? `${error.status} · ${error.statusText || "Unexpected response"}`
      : import.meta.env.DEV && error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";
  return (
    <section className="container-nova grid min-h-[70vh] content-center gap-6 py-24">
      <p className="eyebrow">{is404 ? "Error 404" : "Error"}</p>
      <h1 className="display max-w-3xl text-display">
        {title.split(" ").slice(0, -1).join(" ")} <span className="serif-accent">{title.split(" ").at(-1)}</span>
      </h1>
      <p className="max-w-lg text-lg text-graphite">{detail}</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Back to the store</Link>
        <Link to="/search" className="btn btn-secondary">Search products</Link>
      </div>
      {import.meta.env.DEV && error instanceof Error && error.stack ? (
        <pre className="code-block mt-6 max-h-80">{error.stack}</pre>
      ) : null}
      <p className="text-sm text-stone">Requested: {location.pathname}</p>
    </section>
  );
}
