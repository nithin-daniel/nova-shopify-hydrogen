/** Product cards by handle, for client-side lists (wishlist, compare, recently viewed). */
import type { Route } from "./+types/product-cards";
import { PRODUCT_BY_HANDLE_CARD_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const handles = (new URL(request.url).searchParams.get("handles") ?? "").split(",").filter(Boolean).slice(0, 24);
  const results = await Promise.all(handles.map((handle) => storefront.graphql(PRODUCT_BY_HANDLE_CARD_QUERY, { variables: { handle } })));
  return { products: results.map((r) => r.data?.product).filter((p) => p != null) };
}
