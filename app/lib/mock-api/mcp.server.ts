/**
 * SIMULATED Storefront MCP endpoint for DEMO_MODE (`POST /api/mcp`).
 *
 * With a real store, `handleShopifyRoutes` proxies `/api/mcp` to Shopify's
 * Storefront MCP server. That needs a real shop, so in demo mode this local
 * JSON-RPC 2.0 endpoint answers instead. It mirrors the documented tool names
 * (search_shop_catalog, get_product_details, search_shop_policies_and_faqs,
 * get_cart, update_cart) and reads/writes the same mock catalog and carts.
 * Response payloads are simplified; do not treat them as the exact Shopify
 * contract. See https://shopify.dev/docs/apps/build/storefront-mcp
 */
import { PAGES, POLICIES } from "~/mocks";
import { runMockGraphql } from "./graphql.server";
import { mockStorefrontServer } from "./storefront/index.server";

const TOOLS = [
  {
    name: "search_shop_catalog",
    description: "Search the store's product catalog.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, context: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_product_details",
    description: "Get details, variants and availability for a product handle.",
    inputSchema: { type: "object", properties: { product_handle: { type: "string" } }, required: ["product_handle"] },
  },
  {
    name: "search_shop_policies_and_faqs",
    description: "Answer questions about shipping, returns and other store policies.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_cart",
    description: "Retrieve a cart by id.",
    inputSchema: { type: "object", properties: { cart_id: { type: "string" } }, required: ["cart_id"] },
  },
  {
    name: "update_cart",
    description: "Create a cart or add lines to it. Omit cart_id to create a new cart.",
    inputSchema: {
      type: "object",
      properties: {
        cart_id: { type: "string" },
        add_items: { type: "array", items: { type: "object", properties: { product_variant_id: { type: "string" }, quantity: { type: "number" } } } },
      },
    },
  },
];

const CART_FIELDS = `id checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } } lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id title product { title handle } price { amount currencyCode } } } } }`;

async function gql(origin: string, query: string, variables: Record<string, unknown> = {}) {
  const result = await runMockGraphql(mockStorefrontServer(origin), { query, variables });
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  return result.data as Record<string, unknown>;
}

async function callTool(origin: string, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "search_shop_catalog": {
      const data = await gql(
        origin,
        `query($q: String!) { search(query: $q, first: 6, types: [PRODUCT]) { totalCount nodes { ... on Product { handle title productType availableForSale priceRange { minVariantPrice { amount currencyCode } } featuredImage { url } variants(first: 1) { nodes { id } } } } } }`,
        { q: String(args.query ?? "") },
      );
      return data.search;
    }
    case "get_product_details": {
      const data = await gql(
        origin,
        `query($h: String!) { product(handle: $h) { handle title description productType variants(first: 20) { nodes { id title availableForSale price { amount currencyCode } } } } }`,
        { h: String(args.product_handle ?? "") },
      );
      return data.product;
    }
    case "search_shop_policies_and_faqs": {
      const q = String(args.query ?? "").toLowerCase();
      const words = q.split(/\W+/).filter((w) => w.length > 3);
      const docs = [...POLICIES.map((p) => ({ title: p.title, body: p.body })), ...PAGES.filter((p) => p.handle === "faq").map((p) => ({ title: p.title, body: p.body }))];
      return docs
        .map((d) => ({ ...d, text: d.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") }))
        .map((d) => ({ title: d.title, score: words.filter((w) => d.text.toLowerCase().includes(w)).length, excerpt: d.text.slice(0, 400) }))
        .filter((d) => d.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
    }
    case "get_cart": {
      const data = await gql(origin, `query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id: String(args.cart_id) });
      return data.cart;
    }
    case "update_cart": {
      const lines = ((args.add_items as { product_variant_id: string; quantity?: number }[]) ?? []).map((i) => ({ merchandiseId: i.product_variant_id, quantity: i.quantity ?? 1 }));
      if (!args.cart_id) {
        const data = await gql(origin, `mutation($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } warnings { message } } }`, { lines });
        return data.cartCreate;
      }
      const data = await gql(origin, `mutation($id: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $id, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } warnings { message } } }`, { id: String(args.cart_id), lines });
      return data.cartLinesAdd;
    }
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  }
}

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

export async function handleMockMcp(request: Request) {
  const headers = { "content-type": "application/json", "cache-control": "no-store", "x-nova-simulated": "storefront-mcp" };
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "POST JSON-RPC 2.0 requests" }, id: null }), { status: 405, headers });
  }
  const origin = new URL(request.url).origin;
  let rpc: RpcRequest;
  try {
    rpc = (await request.json()) as RpcRequest;
  } catch {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }), { status: 400, headers });
  }
  const reply = (body: Record<string, unknown>) => new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, ...body }), { headers });
  try {
    switch (rpc.method) {
      case "initialize":
        return reply({ result: { protocolVersion: "2025-06-18", serverInfo: { name: "nova-demo-storefront-mcp (simulated)", version: "1.0.0" }, capabilities: { tools: {} } } });
      case "tools/list":
        return reply({ result: { tools: TOOLS } });
      case "tools/call": {
        const name = String(rpc.params?.name ?? "");
        const result = await callTool(origin, name, (rpc.params?.arguments as Record<string, unknown>) ?? {});
        return reply({ result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result ?? null, isError: false } });
      }
      default:
        return reply({ error: { code: -32601, message: `Method not found: ${rpc.method}` } });
    }
  } catch (error) {
    const err = error as Error & { code?: number };
    return reply({ error: { code: err.code ?? -32603, message: err.message } });
  }
}
