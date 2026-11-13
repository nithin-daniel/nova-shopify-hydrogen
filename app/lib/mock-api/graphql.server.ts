/**
 * A tiny, real GraphQL server for mock data.
 *
 * It builds an executable schema from the introspection JSON that ships inside
 * `@shopify/hydrogen` (the exact Storefront API / Customer Account API schema
 * Hydrogen types against), then executes incoming documents with graphql-js.
 *
 * That means demo mode is not "fake fetch responses": every query the app and
 * Hydrogen's own handlers send is parsed, validated against the real schema and
 * resolved field by field. An invalid field fails here exactly as it would on
 * Shopify, and responses have the real shape.
 *
 * Resolution convention: a source object's property is the field value; if the
 * property is a function it is called with the field arguments (lazy fields,
 * argument-dependent fields such as `selectedOrFirstAvailableVariant`).
 */
import {
  buildClientSchema,
  execute,
  GraphQLError,
  Kind,
  parse,
  validate,
  type DocumentNode,
  type GraphQLFieldResolver,
  type GraphQLSchema,
  type IntrospectionQuery,
  type OperationDefinitionNode,
  type ValueNode,
} from "graphql";

export type MockRequestContext = {
  /** `@inContext(country:)` value, or the API default. */
  country: string;
  /** `@inContext(language:)` value, or the API default. */
  language: string;
  /** Storefront origin, used to build absolute URLs such as checkout links. */
  origin: string;
  /** Extra per-request data supplied by the host (e.g. the Customer Account token). */
  extras: Record<string, unknown>;
};

export type MockRoots = { query: Record<string, unknown>; mutation?: Record<string, unknown> };

export type MockGraphqlServerOptions = {
  name: string;
  introspection: unknown;
  createRoots: (context: MockRequestContext) => MockRoots;
  /** Simulated network latency (ms) for queries and mutations. */
  latency?: { query: number; mutation: number };
  /** Read per-request extras (e.g. auth header) from the incoming request. */
  readExtras?: (request: Request) => Record<string, unknown>;
  getOrigin: () => string;
};

const fieldResolver: GraphQLFieldResolver<unknown, MockRequestContext> = (source, args, context, info) => {
  if (source === null || typeof source !== "object") return null;
  const value = (source as Record<string, unknown>)[info.fieldName];
  if (typeof value === "function") return (value as (a: unknown, c: unknown) => unknown).call(source, args, context);
  return value;
};

const schemaCache = new Map<string, GraphQLSchema>();
const documentCache = new Map<string, DocumentNode>();

function getSchema(name: string, introspection: unknown) {
  let schema = schemaCache.get(name);
  if (!schema) {
    const json = introspection as { __schema?: unknown; data?: { __schema: unknown } };
    const data = (json.__schema ? json : json.data) as IntrospectionQuery;
    // Shopify's schema declares @defer/@stream. graphql-js 17 refuses to execute
    // against a schema with those unless incremental delivery is enabled, and the
    // mock never streams, so drop the two directive definitions.
    const withoutIncremental: IntrospectionQuery = {
      __schema: {
        ...data.__schema,
        directives: data.__schema.directives.filter((d) => d.name !== "defer" && d.name !== "stream"),
      },
    };
    schema = buildClientSchema(withoutIncremental, { assumeValid: true });
    schemaCache.set(name, schema);
  }
  return schema;
}

function valueFromNode(node: ValueNode, variables: Record<string, unknown>): unknown {
  switch (node.kind) {
    case Kind.VARIABLE:
      return variables[node.name.value];
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
      return Number.parseInt(node.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(node.value);
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map((v) => valueFromNode(v, variables));
    case Kind.OBJECT:
      return Object.fromEntries(node.fields.map((f) => [f.name.value, valueFromNode(f.value, variables)]));
    default:
      return undefined;
  }
}

/** Reads `@inContext(country:, language:)` from the executed operation. */
function readInContext(operation: OperationDefinitionNode | undefined, variables: Record<string, unknown>) {
  const directive = operation?.directives?.find((d) => d.name.value === "inContext");
  const args = Object.fromEntries(
    (directive?.arguments ?? []).map((a) => [a.name.value, valueFromNode(a.value, variables)]),
  );
  return {
    country: typeof args.country === "string" ? args.country : "US",
    language: typeof args.language === "string" ? args.language : "EN",
  };
}

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export type MockGraphqlResult = { data?: unknown; errors?: unknown[] };

/** Executes one GraphQL request body against the mock schema. */
export async function runMockGraphql(
  options: MockGraphqlServerOptions,
  body: { query?: string; variables?: Record<string, unknown> | null; operationName?: string | null },
  extras: Record<string, unknown> = {},
): Promise<MockGraphqlResult> {
  const schema = getSchema(options.name, options.introspection);
  const source = body.query ?? "";
  let document = documentCache.get(source);
  if (!document) {
    try {
      document = parse(source);
    } catch (error) {
      return { errors: [formatError(error)] };
    }
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0) return { errors: validationErrors.map(formatError) };
    if (documentCache.size > 500) documentCache.clear();
    documentCache.set(source, document);
  }

  const variables = body.variables ?? {};
  const operation = document.definitions.find(
    (d): d is OperationDefinitionNode =>
      d.kind === Kind.OPERATION_DEFINITION && (!body.operationName || d.name?.value === body.operationName),
  );
  const context: MockRequestContext = { ...readInContext(operation, variables), origin: options.getOrigin(), extras };
  const roots = options.createRoots(context);
  const isMutation = operation?.operation === "mutation";
  await sleep(isMutation ? (options.latency?.mutation ?? 0) : (options.latency?.query ?? 0));

  const result = await execute({
    schema,
    document,
    rootValue: isMutation ? roots.mutation : roots.query,
    contextValue: context,
    variableValues: variables,
    operationName: body.operationName ?? undefined,
    fieldResolver,
  });
  return {
    data: result.data ?? undefined,
    errors: result.errors?.map(formatError),
  };
}

function formatError(error: unknown) {
  if (error instanceof GraphQLError) {
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: { code: error.originalError ? "INTERNAL_SERVER_ERROR" : "GRAPHQL_VALIDATION_FAILED" },
    };
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

/**
 * Returns a `fetch`-compatible function that answers GraphQL POSTs from the mock
 * schema. Pass it as `config.fetch` to Hydrogen's API clients.
 */
export function createMockGraphqlFetch(options: MockGraphqlServerOptions): typeof fetch {
  return async (input, init) => {
    const request = new Request(input as RequestInfo, init);
    if (request.method !== "POST") {
      return Response.json({ errors: [{ message: "Only POST is supported" }] }, { status: 405 });
    }
    let body: { query?: string; variables?: Record<string, unknown>; operationName?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ errors: [{ message: "Invalid JSON body" }] }, { status: 400 });
    }
    const result = await runMockGraphql(options, body, options.readExtras?.(request) ?? {});
    return Response.json(result, {
      headers: { "x-nova-mock-api": options.name, "cache-control": "no-store" },
    });
  };
}

// ---------------------------------------------------------------------------
// Shared helpers for resolvers
// ---------------------------------------------------------------------------

export type ConnectionArgs = { first?: number | null; last?: number | null; after?: string | null; before?: string | null; reverse?: boolean | null };

const encodeCursor = (index: number) => btoa(`nova:${index}`);
const safeAtob = (value: string) => {
  try {
    return atob(value);
  } catch {
    return "";
  }
};
const decodeCursor = (cursor: string | null | undefined) => {
  if (!cursor) return null;
  const match = /^nova:(\d+)$/.exec(safeAtob(cursor));
  return match ? Number(match[1]) : null;
};

/** Relay-style connection over an in-memory list (nodes + edges + pageInfo). */
export function connection<T, N>(items: T[], args: ConnectionArgs, toNode: (item: T) => N, extra: Record<string, unknown> = {}) {
  const list = args.reverse ? [...items].reverse() : items;
  let start = 0;
  let end = list.length;
  const after = decodeCursor(args.after);
  const before = decodeCursor(args.before);
  if (after !== null) start = after + 1;
  if (before !== null) end = Math.min(end, before);
  if (typeof args.first === "number") end = Math.min(end, start + args.first);
  if (typeof args.last === "number") start = Math.max(start, end - args.last);
  const slice = list.slice(start, end).map((item, i) => ({ cursor: encodeCursor(start + i), node: toNode(item) }));
  return {
    nodes: slice.map((e) => e.node),
    edges: slice,
    pageInfo: {
      hasNextPage: end < list.length,
      hasPreviousPage: start > 0,
      startCursor: slice[0]?.cursor ?? null,
      endCursor: slice.at(-1)?.cursor ?? null,
    },
    totalCount: list.length,
    ...extra,
  };
}

export const gid = (type: string, id: string) => `gid://shopify/${type}/${id}`;
export const parseGid = (value: string) => value.replace(/^gid:\/\/shopify\/[A-Za-z]+\//, "").replace(/\?.*$/, "");
export const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
