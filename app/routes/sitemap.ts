/** Sitemap built from Storefront API data (Hydrogen ships no sitemap helper; app-owned SEO). */
import type { Route } from "./+types/sitemap";
import { SITEMAP_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";


export async function loader({ request, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const origin = new URL(request.url).origin;
  const { data, errors } = await storefront.graphql(SITEMAP_QUERY);
  if (errors || !data) {
    console.error("[nova] sitemap query failed", errors);
    throw new Response("Sitemap unavailable", { status: 500 });
  }
  const url = (path: string, lastmod?: string | null) => `  <url><loc>${origin}${path}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}</url>`;
  const urls = [
    url("/"),
    url("/collections"),
    ...data.collections.nodes.map((c) => url(`/collections/${c.handle}`, c.updatedAt)),
    ...data.products.nodes.map((p) => url(`/products/${p.handle}`, p.updatedAt)),
    ...data.pages.nodes.map((p) => url(`/pages/${p.handle}`, p.updatedAt)),
    ...data.blogs.nodes.flatMap((b) => [url(`/blogs/${b.handle}`), ...b.articles.nodes.map((a) => url(`/blogs/${b.handle}/${a.handle}`, a.publishedAt))]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
