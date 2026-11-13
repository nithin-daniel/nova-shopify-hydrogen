import type { Route } from "./+types/$";

export function loader(_: Route.LoaderArgs) {
  // Router 404 → root middleware then tries handleShopifyRedirects().
  throw new Response("Not found", { status: 404 });
}

export const meta: Route.MetaFunction = () => [{ title: "Page not found | NOVA" }, { name: "robots", content: "noindex" }];

export default function CatchAll() {
  return null;
}
