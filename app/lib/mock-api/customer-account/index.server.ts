/**
 * Mock Customer Account API, executed against Hydrogen's packaged
 * `customer-account.schema.json`. In DEMO_MODE the app passes
 * `createMockCustomerAccountFetch()` to `createCustomerAccountClient`, so account
 * pages run the same typed CAAPI queries they would against Shopify.
 *
 * Auth: the access token (kept server-side in the demo session cookie) is
 * `demo.<customerId>`. Edits to profile and addresses are stored in an
 * in-memory overlay on the server and reset when the server restarts.
 */
import customerAccountSchema from "@shopify/hydrogen/customer-account.schema.json";
import { CUSTOMERS, ORDERS, SHOP, findCustomer, findVariant, type MockAddress, type MockCustomer, type MockOrder } from "~/mocks";
import { connection, createMockGraphqlFetch, gid, parseGid, type ConnectionArgs, type MockRequestContext } from "../graphql.server";
import { toImage } from "../storefront/catalog.server";

export const DEMO_TOKEN_PREFIX = "demo.";

type Overlay = { firstName?: string; lastName?: string; addresses?: MockAddress[]; defaultAddressId?: string };
const g = globalThis as unknown as { __novaCustomerOverlay?: Map<string, Overlay> };
const overlays = (g.__novaCustomerOverlay ??= new Map<string, Overlay>());

function currentCustomer(id: string): MockCustomer | null {
  const base = findCustomer(id);
  if (!base) return null;
  const o = overlays.get(id) ?? {};
  return { ...base, ...o, addresses: o.addresses ?? base.addresses, defaultAddressId: o.defaultAddressId ?? base.defaultAddressId };
}

const money = (cents: number, currencyCode: string) => ({ __typename: "MoneyV2", amount: (cents / 100).toFixed(2), currencyCode });

function toAddress(a: MockAddress) {
  const area = [a.city, a.provinceCode ?? a.province, a.zip].filter(Boolean).join(", ");
  return {
    id: gid("CustomerAddress", a.id),
    firstName: a.firstName,
    lastName: a.lastName,
    name: `${a.firstName} ${a.lastName}`,
    company: a.company ?? null,
    address1: a.address1,
    address2: a.address2 ?? null,
    city: a.city,
    province: a.province ?? null,
    zoneCode: a.provinceCode ?? null,
    zip: a.zip,
    country: a.country,
    territoryCode: a.countryCode,
    countryCode: a.countryCode,
    phoneNumber: a.phone ?? null,
    formattedArea: `${area}, ${a.country}`,
    formatted: ({ withName, withCompany }: { withName?: boolean; withCompany?: boolean }) =>
      [withName ? `${a.firstName} ${a.lastName}` : null, withCompany ? a.company : null, a.address1, a.address2, area, a.country].filter(Boolean),
  };
}

function orderTotals(order: MockOrder) {
  const before = order.lineItems.reduce((s, l) => s + l.price * l.quantity, 0);
  const lineDiscounts = order.lineItems.reduce((s, l) => s + (l.discount ?? 0), 0);
  const subtotal = before - lineDiscounts - (order.orderDiscount ?? 0);
  return { before, subtotal, total: subtotal + order.shipping + order.tax };
}

function toOrder(order: MockOrder, customer: MockCustomer, ctx: MockRequestContext) {
  const totals = orderTotals(order);
  const c = order.currencyCode;
  const address = customer.addresses.find((a) => a.id === order.shippingAddressId) ?? findCustomer(customer.id)?.addresses.find((a) => a.id === order.shippingAddressId);
  const lineItems = order.lineItems.map((line, i) => {
    const found = findVariant(line.variantId);
    const product = found?.product;
    const variant = found?.variant;
    const image = product && variant ? product.images[variant.imageIndex ?? 0] : undefined;
    const lineTotal = line.price * line.quantity - (line.discount ?? 0);
    return {
      id: gid("LineItem", `${order.id}${i}`),
      title: product?.title ?? line.productHandle,
      name: product?.title ?? line.productHandle,
      presentmentTitle: product?.title ?? line.productHandle,
      variantTitle: variant ? Object.values(variant.options).join(" / ") : null,
      presentmentVariantTitle: variant ? Object.values(variant.options).join(" / ") : null,
      variantOptions: product && variant ? product.options.map((o) => ({ name: o.name, value: variant.options[o.name] })) : [],
      variantId: variant ? `gid://shopify/ProductVariant/${variant.id}` : null,
      productId: product ? `gid://shopify/Product/${product.id}` : null,
      productType: product?.productType ?? null,
      vendor: product?.vendor ?? null,
      sku: variant?.sku ?? null,
      quantity: line.quantity,
      soldQuantity: line.quantity,
      refundableQuantity: order.financialStatus === "REFUNDED" ? 0 : line.quantity,
      requiresShipping: !product?.isGiftCard,
      giftCard: Boolean(product?.isGiftCard),
      image: toImage(image),
      price: money(line.price, c),
      unitPrice: null,
      totalPrice: money(lineTotal, c),
      currentTotalPrice: money(lineTotal, c),
      totalPriceBeforeDiscounts: money(line.price * line.quantity, c),
      totalPriceWithDiscounts: money(lineTotal, c),
      totalDiscount: money(line.discount ?? 0, c),
      customAttributes: [],
      discountAllocations: [],
    };
  });
  const fulfillments = order.fulfillments.map((f) => ({
    id: gid("Fulfillment", f.id),
    status: f.status,
    latestShipmentStatus: f.latestShipmentStatus,
    estimatedDeliveryAt: f.estimatedDeliveryAt ?? null,
    createdAt: f.events[0]?.happenedAt ?? order.processedAt,
    updatedAt: f.events.at(-1)?.happenedAt ?? order.processedAt,
    requiresShipping: true,
    isPickedUp: false,
    pickupAddress: null,
    trackingInformation: [{ company: f.carrier, number: f.trackingNumber, url: f.trackingUrl }],
    events: (args: ConnectionArgs) =>
      connection(f.events, args, (e, ) => ({ id: gid("FulfillmentEvent", `${f.id}-${e.happenedAt}`), status: e.status, happenedAt: e.happenedAt })),
    fulfillmentLineItems: (args: ConnectionArgs) =>
      connection(f.lineIndexes, args, (i) => ({ id: gid("FulfillmentLineItem", `${f.id}-${i}`), quantity: order.lineItems[i].quantity, lineItem: lineItems[i] })),
  }));
  return {
    id: gid("Order", order.id),
    name: `#${order.number}`,
    number: order.number,
    confirmationNumber: `NV${order.number}X`,
    processedAt: order.processedAt,
    createdAt: order.processedAt,
    updatedAt: order.processedAt,
    cancelledAt: order.cancelledAt ?? null,
    cancelReason: order.cancelReason ?? null,
    currencyCode: c,
    email: customer.email,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus === "CANCELLED" ? "UNFULFILLED" : order.fulfillmentStatus,
    note: order.note ?? null,
    requiresShipping: lineItems.some((l) => l.requiresShipping),
    statusPageUrl: `${ctx.origin}/account/orders/${order.id}`,
    subtotalBeforeDiscounts: money(totals.before, c),
    subtotal: money(totals.subtotal, c),
    totalShipping: money(order.shipping, c),
    totalTax: money(order.tax, c),
    totalPrice: money(totals.total, c),
    totalRefunded: money(order.refunded ?? 0, c),
    shippingLine: { handle: order.shippingMethod.toLowerCase().replace(/\W+/g, "-"), title: order.shippingMethod, originalPrice: money(order.shipping, c) },
    shippingAddress: address ? toAddress(address) : null,
    billingAddress: address ? toAddress(address) : null,
    refunds: order.refunded ? [{ id: gid("Refund", order.id), createdAt: order.cancelledAt ?? order.processedAt, updatedAt: order.processedAt, totalRefunded: money(order.refunded, c), returnName: null }] : [],
    discountApplications: (args: ConnectionArgs) =>
      connection(order.discountCode ? [order.discountCode] : [], args, (code) => ({
        __typename: "DiscountCodeApplication",
        code,
        allocationMethod: "ACROSS",
        targetSelection: "ALL",
        targetType: order.discountCode === "FREESHIP" ? "SHIPPING_LINE" : "LINE_ITEM",
        value: money((order.orderDiscount ?? 0) + order.lineItems.reduce((s, l) => s + (l.discount ?? 0), 0), c),
      })),
    lineItems: (args: ConnectionArgs) => connection(lineItems, args, (x) => x),
    fulfillments: (args: ConnectionArgs) => connection(fulfillments, args, (x) => x),
    hasMultipleFulfillments: fulfillments.length > 1,
    latestFulfillmentDeliveryDate: order.fulfillments.flatMap((f) => f.events).filter((e) => e.status === "DELIVERED").at(-1)?.happenedAt ?? null,
    customAttributes: [],
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  };
}

function sortOrders(orders: MockOrder[], sortKey?: string) {
  const list = [...orders];
  if (sortKey === "ORDER_NUMBER") return list.sort((a, b) => a.number - b.number);
  if (sortKey === "TOTAL_PRICE") return list.sort((a, b) => orderTotals(a).total - orderTotals(b).total);
  return list.sort((a, b) => a.processedAt.localeCompare(b.processedAt));
}

type AddressInput = { firstName?: string; lastName?: string; company?: string; address1?: string; address2?: string; city?: string; zoneCode?: string; zip?: string; countryCode?: string; phoneNumber?: string };

const COUNTRY_NAMES: Record<string, string> = { US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany", FR: "France", AU: "Australia", JP: "Japan" };

function validateAddress(input: AddressInput) {
  const errors: { code: string; field: string[]; message: string }[] = [];
  for (const key of ["address1", "city", "zip"] as const) {
    if (!input[key]?.trim()) errors.push({ code: "BLANK", field: ["address", key], message: `${key === "address1" ? "Address" : key === "zip" ? "Postal code" : "City"} can't be blank` });
  }
  return errors;
}

function createRoots(ctx: MockRequestContext) {
  const customerId = typeof ctx.extras.customerId === "string" ? ctx.extras.customerId : null;
  const customer = customerId ? currentCustomer(customerId) : null;
  const unauthorized = () => {
    throw new Error("Unauthorized: missing or invalid customer access token");
  };
  const toCustomer = (c: MockCustomer) => ({
    id: gid("Customer", c.id),
    firstName: c.firstName,
    lastName: c.lastName,
    displayName: `${c.firstName} ${c.lastName}`,
    creationDate: c.createdAt,
    createdAt: c.createdAt,
    tags: c.tags,
    imageUrl: `https://www.gravatar.com/avatar/?d=mp`,
    marketCurrencyCode: "USD",
    emailAddress: { emailAddress: c.email, marketingState: c.acceptsMarketing ? "SUBSCRIBED" : "NOT_SUBSCRIBED" },
    phoneNumber: c.phone ? { phoneNumber: c.phone, marketingState: "NOT_SUBSCRIBED" } : null,
    defaultAddress: (() => {
      const a = c.addresses.find((x) => x.id === c.defaultAddressId);
      return a ? toAddress(a) : null;
    })(),
    addresses: (args: ConnectionArgs & { skipDefault?: boolean }) =>
      connection(c.addresses.filter((a) => !args.skipDefault || a.id !== c.defaultAddressId), args, toAddress),
    orders: (args: ConnectionArgs & { sortKey?: string }) =>
      connection(sortOrders(ORDERS.filter((o) => o.customerId === c.id), args.sortKey), args, (o) => toOrder(o, c, ctx)),
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  });

  const mutateAddresses = (fn: (list: MockAddress[], o: Overlay) => MockAddress[]) => {
    if (!customer) return unauthorized();
    const o = overlays.get(customer.id) ?? {};
    o.addresses = fn([...customer.addresses], o);
    overlays.set(customer.id, o);
  };

  return {
    query: {
      customer: () => (customer ? toCustomer(customer) : unauthorized()),
      order: ({ id }: { id: string }) => {
        if (!customer) return unauthorized();
        const order = ORDERS.find((o) => o.id === parseGid(id) && o.customerId === customer.id);
        return order ? toOrder(order, customer, ctx) : null;
      },
      shop: { id: SHOP.id, name: SHOP.name, email: SHOP.email, myshopifyDomain: SHOP.myshopifyDomain, url: SHOP.primaryDomain, shopPolicies: [], metafield: () => null, metafields: () => [] },
    },
    mutation: {
      customerUpdate: ({ input }: { input: { firstName?: string; lastName?: string } }) => {
        if (!customer) return unauthorized();
        const errors = [];
        if (input.firstName !== undefined && !input.firstName.trim()) errors.push({ code: "BLANK", field: ["input", "firstName"], message: "First name can't be blank" });
        if (!errors.length) overlays.set(customer.id, { ...(overlays.get(customer.id) ?? {}), ...input });
        return { customer: toCustomer(currentCustomer(customer.id)!), userErrors: errors };
      },
      customerAddressCreate: ({ address, defaultAddress }: { address: AddressInput; defaultAddress?: boolean }) => {
        const errors = validateAddress(address);
        if (errors.length) return { customerAddress: null, userErrors: errors };
        const created: MockAddress = {
          id: String(9_200_000_000 + Math.floor(Math.random() * 99_999_999)),
          firstName: address.firstName ?? "",
          lastName: address.lastName ?? "",
          company: address.company,
          address1: address.address1!,
          address2: address.address2,
          city: address.city!,
          provinceCode: address.zoneCode,
          province: address.zoneCode,
          zip: address.zip!,
          countryCode: address.countryCode ?? "US",
          country: COUNTRY_NAMES[address.countryCode ?? "US"] ?? (address.countryCode ?? "US"),
          phone: address.phoneNumber,
        };
        mutateAddresses((list, o) => {
          if (defaultAddress || list.length === 0) o.defaultAddressId = created.id;
          return [...list, created];
        });
        return { customerAddress: toAddress(created), userErrors: [] };
      },
      customerAddressUpdate: ({ addressId, address, defaultAddress }: { addressId: string; address?: AddressInput; defaultAddress?: boolean }) => {
        const id = parseGid(addressId);
        let updated: MockAddress | undefined;
        const errors = address ? validateAddress({ address1: "x", city: "x", zip: "x", ...stripUndefined(address) }) : [];
        if (errors.length) return { customerAddress: null, userErrors: errors };
        mutateAddresses((list, o) => {
          if (defaultAddress) o.defaultAddressId = id;
          return list.map((a) => {
            if (a.id !== id) return a;
            updated = {
              ...a,
              ...stripUndefined({ firstName: address?.firstName, lastName: address?.lastName, company: address?.company, address1: address?.address1, address2: address?.address2, city: address?.city, zip: address?.zip, phone: address?.phoneNumber }),
              ...(address?.zoneCode ? { provinceCode: address.zoneCode, province: address.zoneCode } : {}),
              ...(address?.countryCode ? { countryCode: address.countryCode, country: COUNTRY_NAMES[address.countryCode] ?? address.countryCode } : {}),
            };
            return updated;
          });
        });
        return updated
          ? { customerAddress: toAddress(updated), userErrors: [] }
          : { customerAddress: null, userErrors: [{ code: "NOT_FOUND", field: ["addressId"], message: "Address not found" }] };
      },
      customerAddressDelete: ({ addressId }: { addressId: string }) => {
        const id = parseGid(addressId);
        mutateAddresses((list, o) => {
          if (o.defaultAddressId === id) o.defaultAddressId = list.find((a) => a.id !== id)?.id;
          return list.filter((a) => a.id !== id);
        });
        return { deletedAddressId: addressId, userErrors: [] };
      },
    },
  };
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as Partial<T>;
}

/** `fetch` replacement passed to `createCustomerAccountClient` in DEMO_MODE. */
export function createMockCustomerAccountFetch(origin: string) {
  return createMockGraphqlFetch({
    name: "customer-account",
    introspection: customerAccountSchema,
    createRoots,
    latency: { query: 40, mutation: 300 },
    getOrigin: () => origin,
    readExtras: (request) => {
      const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      const id = token.startsWith(DEMO_TOKEN_PREFIX) ? token.slice(DEMO_TOKEN_PREFIX.length) : null;
      return { customerId: id && findCustomer(id) ? id : null };
    },
  });
}

/** Demo login picker data (names and personas only, no tokens). */
export const DEMO_CUSTOMERS = CUSTOMERS.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email, persona: c.persona }));
