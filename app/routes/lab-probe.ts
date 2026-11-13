/**
 * Lab helper: performs a request against this same server (no redirects
 * followed) and reports status, location and selected headers, or extracts SEO
 * tags from a rendered page. Restricted to same-origin paths.
 */
import type { Route } from "./+types/lab-probe";

const HEADERS = ["content-type", "cache-control", "location", "set-cookie", "x-nova-mock-api", "x-nova-simulated", "x-nova-demo-mode", "vary"];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  if (!path.startsWith("/") || path.startsWith("//")) return { error: "Only same-origin paths" };
  const method = url.searchParams.get("method") === "POST" ? "POST" : "GET";
  const body = url.searchParams.get("body") ?? undefined;
  const started = performance.now();
  const response = await fetch(new URL(path, url.origin), {
    method,
    redirect: "manual",
    headers: { cookie: request.headers.get("cookie") ?? "", "content-type": "application/json", referer: url.origin + "/" },
    body: method === "POST" ? body : undefined,
  });
  const ms = Math.round(performance.now() - started);
  const text = await response.text();
  const headers = Object.fromEntries(HEADERS.map((h) => [h, response.headers.get(h)]).filter(([, v]) => v));
  if (url.searchParams.get("mode") === "seo") {
    const pick = (re: RegExp) => [...text.matchAll(re)].map((m) => m[1]);
    return {
      status: response.status,
      ms,
      seo: {
        title: pick(/<title>([^<]*)<\/title>/g)[0] ?? null,
        description: pick(/<meta name="description" content="([^"]*)"/g)[0] ?? null,
        canonical: pick(/<link rel="canonical" href="([^"]*)"/g)[0] ?? null,
        og: pick(/<meta property="(og:[a-z]+)"/g),
        jsonLd: pick(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((j) => {
          try {
            return JSON.parse(j);
          } catch {
            return j;
          }
        }),
      },
    };
  }
  return { status: response.status, ms, headers, body: text.slice(0, 1800), truncated: text.length > 1800 };
}
