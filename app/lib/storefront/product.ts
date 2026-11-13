/** Typed React product bindings (skill: hydrogen-variant-form, React Router reference). */
import { buildProductSelectionSearchParams, type SelectedOption } from "@shopify/hydrogen";
import { createProductComponents } from "@shopify/hydrogen/react";
import type { ProductData } from "~/lib/queries/product.server";

export const { ProductProvider, useProduct, useProductForm } = createProductComponents<ProductData>();

/** `/products/{handle}?{options}`, keeping unrelated params such as ?ref=campaign. */
export function variantUrl(
  product: { handle: string; options: { name: string }[] },
  selectedOptions: SelectedOption[],
  handle: string | undefined,
  base: URLSearchParams,
) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((o) => o.name),
    base,
  });
  const query = params.toString();
  return `/products/${handle ?? product.handle}${query ? `?${query}` : ""}`;
}
