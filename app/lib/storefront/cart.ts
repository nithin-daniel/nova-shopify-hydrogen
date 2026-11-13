/**
 * Typed React cart bindings derived from the server cart handlers.
 * `import type` keeps the handler module (server code) out of the browser.
 */
import { createCartComponents } from "@shopify/hydrogen/react";
import type { cartHandlers } from "~/lib/shopify/handlers.server";

export const { CartProvider, useCart, useSuspenseCart, useOptionalCart, useCartActions, useCartForm } =
  createCartComponents<typeof cartHandlers>();

type CartState = Parameters<Parameters<typeof useCart>[0]>[0];
export type CartData = CartState["data"];
export type CartLineData = CartData["lines"]["nodes"][number];
