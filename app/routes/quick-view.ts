import type { Route } from "./+types/quick-view";
import { PRODUCT_QUERY } from "~/lib/queries/product.server";
import { shopifyContext } from "~/lib/shopify/context";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { storefront, demoMode } = context.get(shopifyContext);
  const handle = new URL(request.url).searchParams.get("handle");
  if (!handle) return { product: null };
  const { data, errors } = await storefront.graphql(PRODUCT_QUERY, { variables: { handle, selectedOptions: [], withInventory: demoMode } });
  if (errors) console.error("[nova] quick view failed", errors);
  return { product: data?.product ?? null };
}
