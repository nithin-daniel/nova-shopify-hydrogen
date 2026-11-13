import type { Route } from "./+types/recommendations";
import { RECOMMENDATIONS_QUERY } from "~/lib/queries/product.server";
import { shopifyContext } from "~/lib/shopify/context";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");
  if (!handle) return { products: [] };
  const { data } = await storefront.graphql(RECOMMENDATIONS_QUERY, { variables: { handle } });
  const intent = url.searchParams.get("intent") === "COMPLEMENTARY" ? "complementary" : "related";
  return { products: data?.[intent] ?? [] };
}
