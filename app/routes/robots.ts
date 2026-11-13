/** robots.txt (skill: hydrogen-robots-txt), adjusted to this app's routes and market prefixes. */
import type { Route } from "./+types/robots";
import { getSupportedLocales } from "@shopify/hydrogen";
import { i18n } from "~/lib/shopify/i18n";

export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const prefixes = getSupportedLocales(i18n)
    .map((l) => ("pathSegment" in l && l.pathSegment ? `/${l.pathSegment}` : `/${l.language}-${l.country}`.toLowerCase().replace(/_/g, "-")))
    .filter((p) => p !== "/en-us");
  const pageRules = (p: string) => [`Disallow: ${p}/cart`, `Disallow: ${p}/account`, `Disallow: ${p}/search`, `Disallow: ${p}/wishlist`, `Disallow: ${p}/compare`];
  const body = [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /account",
    "Disallow: /checkout",
    "Disallow: /demo-checkout",
    "Disallow: /buy/",
    "Disallow: /api/",
    "Disallow: /__shopify",
    "Disallow: /search",
    "Disallow: /wishlist",
    "Disallow: /compare",
    "Disallow: /quick-view",
    "Disallow: /recommendations",
    "Disallow: /product-cards",
    "Disallow: /collections/*sort_by*",
    "Disallow: /collections/*filter*&*filter*",
    ...prefixes.flatMap(pageRules),
    "Disallow: /*/collections/*sort_by*",
    "Disallow: /*/collections/*filter*&*filter*",
    "",
    "# Google AdsBot ignores the \"*\" group and follows only groups that name it.",
    "User-agent: adsbot-google",
    "Disallow: /cart",
    "Disallow: /account",
    "Disallow: /checkout",
    "Disallow: /search",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
