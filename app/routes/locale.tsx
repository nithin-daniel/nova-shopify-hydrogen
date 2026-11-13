/**
 * Market layout for the optional `/:locale?` prefix. Rejects unknown prefixes
 * (e.g. /xx/products/a) so each page has one canonical URL per market.
 */
import { isRouteErrorResponse, Outlet } from "react-router";
import type { Route } from "./+types/locale";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { requestContext } = context.get(shopifyContext);
  if (params.locale && `/${params.locale.toLowerCase()}` !== requestContext.locale.pathPrefix) {
    throw new Response("Not found", { status: 404 });
  }
  return null;
}

export default function LocaleLayout() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="container-nova grid min-h-[60vh] content-center gap-6 py-24">
      <p className="eyebrow">{is404 ? "Error 404" : "Something went wrong"}</p>
      <h1 className="display max-w-3xl text-display">
        {is404 ? <>This page drifted <span className="serif-accent">off.</span></> : <>We hit a <span className="serif-accent">snag.</span></>}
      </h1>
      <p className="max-w-lg text-lg text-graphite">
        {is404
          ? "The page you're looking for doesn't exist, or it has moved."
          : isRouteErrorResponse(error)
            ? `${error.status} · ${typeof error.data === "string" ? error.data : error.statusText}`
            : "An unexpected error occurred. The details are in the server log."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Back to the store</Link>
        <Link to="/collections/best-sellers" className="btn btn-secondary">Shop best sellers</Link>
      </div>
    </section>
  );
}
