/**
 * In-memory cart engine for the mock Storefront API.
 *
 * Carts live on the server (never in the browser) in a module-level map that
 * survives Vite HMR. Hydrogen's cart handlers only see the cart token cookie,
 * exactly as with a real store. Restarting the dev server clears carts; the
 * handlers then return `{cart: null}` and the UI shows an empty cart.
 */
import {
  AUTOMATIC_DISCOUNTS,
  DISCOUNT_CODES,
  GIFT_CARDS,
  collectionProducts,
  findCollection,
  findMarket,
  findVariant,
  type MockDiscountCode,
  type MockMarket,
  type MockProduct,
  type MockVariant,
} from "~/mocks";
import { connection, gid, parseGid, type MockRequestContext } from "../graphql.server";
import { isAvailable, moneyV2, presentmentAmount, toVariant } from "./catalog.server";

type Attribute = { key: string; value: string };

type StoredLine = { id: string; variantId: string; quantity: number; attributes: Attribute[] };

type StoredCart = {
  token: string;
  lines: StoredLine[];
  note: string;
  attributes: Attribute[];
  discountCodes: string[];
  giftCardCodes: string[];
  buyerIdentity: { countryCode: string | null; email: string | null; customerId: string | null };
  createdAt: string;
  updatedAt: string;
};

type UserError = { code: string | null; field: string[] | null; message: string };
type Warning = { code: string; message: string; target: string };

const globalStore = globalThis as unknown as { __novaCarts?: Map<string, StoredCart> };
const carts = (globalStore.__novaCarts ??= new Map<string, StoredCart>());

const randomToken = () => `nova${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
const cartGid = (token: string) => gid("Cart", token);
const tokenFromId = (id: string) => parseGid(id);
const now = () => new Date().toISOString();

export function getStoredCart(id: string) {
  return carts.get(tokenFromId(id)) ?? null;
}

// ---------------------------------------------------------------------------
// Pricing engine (integer minor units, never floats for totals)
// ---------------------------------------------------------------------------

const toMinor = (major: number) => Math.round(major * 100);
const fromMinor = (minor: number) => minor / 100;

type PricedLine = {
  stored: StoredLine;
  product: MockProduct;
  variant: MockVariant;
  unit: number; // minor units, presentment currency
  compareAt: number | null;
  subtotal: number;
  allocations: { kind: "code" | "automatic"; label: string; amount: number }[];
};

function codeAppliesTo(discount: MockDiscountCode, product: MockProduct) {
  if (discount.eligibleProductHandles) return discount.eligibleProductHandles.includes(product.handle);
  if (discount.eligibleCollectionHandles) {
    return discount.eligibleCollectionHandles.some((h) => {
      const collection = findCollection(h);
      return collection ? collectionProducts(collection).some((p) => p.handle === product.handle) : false;
    });
  }
  return true;
}

/** Splits `amount` across lines proportionally to their weights (largest remainder). */
function allocate(amount: number, weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const floored = raw.map(Math.floor);
  let remainder = amount - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}

export function priceCart(cart: StoredCart, market: MockMarket) {
  const lines: PricedLine[] = cart.lines.flatMap((stored) => {
    const found = findVariant(stored.variantId);
    if (!found) return [];
    const unit = toMinor(presentmentAmount(found.variant.price, market));
    const compareAt = found.variant.compareAtPrice ? toMinor(presentmentAmount(found.variant.compareAtPrice, market)) : null;
    return [{ stored, product: found.product, variant: found.variant, unit, compareAt, subtotal: unit * stored.quantity, allocations: [] }];
  });

  const merchandise = lines.reduce((s, l) => s + l.subtotal, 0);
  const minimumIn = (cents: number) => toMinor(presentmentAmount(cents, market));

  // Automatic discounts (bundles) allocate to their qualifying lines.
  const handles = new Set(lines.map((l) => l.product.handle));
  for (const auto of AUTOMATIC_DISCOUNTS) {
    if (!auto.requiresAllOf.every((h) => handles.has(h))) continue;
    for (const line of lines) {
      if (auto.requiresAllOf.includes(line.product.handle)) {
        line.allocations.push({ kind: "automatic", label: auto.title, amount: Math.round((line.subtotal * auto.percent) / 100) });
      }
    }
  }

  // Discount codes.
  const codeResults: { code: string; applicable: boolean; reason?: string }[] = [];
  const orderAllocations: { code: string; amount: number }[] = [];
  let exclusiveUsed = false;
  for (const raw of cart.discountCodes) {
    const discount = DISCOUNT_CODES.find((d) => d.code.toLowerCase() === raw.toLowerCase());
    const result = { code: raw, applicable: false } as { code: string; applicable: boolean; reason?: string };
    codeResults.push(result);
    if (!discount) {
      result.reason = "DISCOUNT_NOT_FOUND";
      continue;
    }
    result.code = discount.code;
    const nowIso = now();
    if (nowIso < discount.startsAt || (discount.endsAt && nowIso > discount.endsAt)) {
      result.reason = "DISCOUNT_CURRENTLY_INACTIVE";
      continue;
    }
    if (discount.minimumSubtotal && merchandise < minimumIn(discount.minimumSubtotal)) {
      result.reason = "DISCOUNT_PURCHASE_NOT_IN_RANGE";
      continue;
    }
    if (!discount.combinesWithOtherCodes && (exclusiveUsed || codeResults.some((r) => r !== result && r.applicable))) {
      result.reason = "DISCOUNT_NOT_HONOURED";
      continue;
    }
    const eligible = lines.filter((l) => codeAppliesTo(discount, l.product));
    if (eligible.length === 0) {
      result.reason = "DISCOUNT_NO_ENTITLED_LINE_ITEMS";
      continue;
    }
    result.applicable = true;
    if (!discount.combinesWithOtherCodes) exclusiveUsed = true;
    const rule = discount.rule;
    if (rule.kind === "free_shipping") continue; // applied to shipping at checkout
    const scoped = Boolean(discount.eligibleProductHandles || discount.eligibleCollectionHandles);
    if (scoped) {
      for (const line of eligible) {
        const amount = rule.kind === "percentage" ? Math.round((line.subtotal * rule.percent) / 100) : 0;
        line.allocations.push({ kind: "code", label: discount.code, amount });
      }
    } else {
      const amount =
        rule.kind === "percentage" ? Math.round((merchandise * rule.percent) / 100) : Math.min(merchandise, minimumIn(rule.amount));
      orderAllocations.push({ code: discount.code, amount });
    }
  }

  const lineTotals = lines.map((l) => Math.max(0, l.subtotal - l.allocations.reduce((s, a) => s + a.amount, 0)));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  const orderDiscount = Math.min(subtotal, orderAllocations.reduce((s, a) => s + a.amount, 0));
  const total = subtotal - orderDiscount;

  // Gift cards (presentment currency = USD only in this demo; others convert).
  let remaining = total;
  const giftCards = cart.giftCardCodes.flatMap((code) => {
    const card = GIFT_CARDS.find((g) => g.code === code);
    if (!card) return [];
    const balance = toMinor(presentmentAmount(card.balance, market));
    const used = Math.min(balance, remaining);
    remaining -= used;
    return [{ card, balance, used }];
  });

  return { lines, lineTotals, codeResults, orderAllocations, subtotal, orderDiscount, total, giftCards, checkoutCharge: remaining, merchandise };
}

// ---------------------------------------------------------------------------
// Storefront API shape
// ---------------------------------------------------------------------------

export function toCart(cart: StoredCart, ctx: MockRequestContext) {
  const market = findMarket(ctx.country || cart.buyerIdentity.countryCode || "US");
  const priced = priceCart(cart, market);
  const m = (minor: number) => moneyV2(fromMinor(minor), market.currencyCode);

  const lineNodes = priced.lines.map((line, i) => {
    const lineAllocations = line.allocations.map((a) =>
      a.kind === "code"
        ? { __typename: "CartCodeDiscountAllocation", code: a.label, discountedAmount: m(a.amount), targetType: "LINE_ITEM", discountApplication: null, sourceDiscountApplication: null }
        : { __typename: "CartAutomaticDiscountAllocation", title: a.label, discountedAmount: m(a.amount), targetType: "LINE_ITEM", discountApplication: null, sourceDiscountApplication: null },
    );
    return {
      __typename: "CartLine",
      id: line.stored.id,
      quantity: line.stored.quantity,
      attributes: line.stored.attributes,
      attribute: ({ key }: { key: string }) => line.stored.attributes.find((a) => a.key === key) ?? null,
      merchandise: toVariant(line.product, line.variant, ctx),
      cost: {
        amountPerQuantity: m(line.unit),
        compareAtAmountPerQuantity: line.compareAt ? m(line.compareAt) : null,
        subtotalAmount: m(line.subtotal),
        totalAmount: m(priced.lineTotals[i]),
      },
      estimatedCost: { amount: m(priced.lineTotals[i]), totalAmount: m(priced.lineTotals[i]), subtotalAmount: m(line.subtotal), compareAtAmount: line.compareAt ? m(line.compareAt * line.stored.quantity) : null },
      discountAllocations: () => lineAllocations,
      sellingPlanAllocation: null,
      parentRelationship: null,
      instructions: { canRemove: true, canUpdateQuantity: true },
      viewKey: null,
    };
  });

  return {
    id: cartGid(cart.token),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    checkoutUrl: `${ctx.origin}/demo-checkout?cart=${cart.token}`,
    note: cart.note || null,
    attributes: cart.attributes,
    attribute: ({ key }: { key: string }) => cart.attributes.find((a) => a.key === key) ?? null,
    totalQuantity: cart.lines.reduce((s, l) => s + l.quantity, 0),
    lines: (args: Record<string, unknown>) => connection(lineNodes, args, (x) => x),
    discountCodes: priced.codeResults.map((r) => ({ code: r.code, applicable: r.applicable })),
    discountAllocations: priced.orderAllocations.map((a) => ({
      __typename: "CartCodeDiscountAllocation",
      code: a.code,
      discountedAmount: m(a.amount),
      targetType: "LINE_ITEM",
      discountApplication: null,
      sourceDiscountApplication: null,
    })),
    discountApplications: [],
    appliedGiftCards: priced.giftCards.map(({ card, balance, used }) => ({
      id: gid("AppliedGiftCard", card.code),
      lastCharacters: card.code.slice(-4),
      amountUsed: m(used),
      amountUsedV2: m(used),
      presentmentAmountUsed: m(used),
      balance: m(balance - used),
      balanceV2: m(balance - used),
    })),
    buyerIdentity: {
      countryCode: cart.buyerIdentity.countryCode,
      email: cart.buyerIdentity.email,
      phone: null,
      customer: null,
      deliveryAddressPreferences: [],
      preferences: null,
      purchasingCompany: null,
    },
    cost: {
      subtotalAmount: m(priced.subtotal),
      subtotalAmountEstimated: false,
      totalAmount: m(priced.total),
      totalAmountEstimated: true,
      checkoutChargeAmount: m(priced.checkoutCharge),
      totalTaxAmount: null,
      totalTaxAmountEstimated: true,
      totalDutyAmount: null,
      totalDutyAmountEstimated: true,
    },
    estimatedCost: { subtotalAmount: m(priced.subtotal), totalAmount: m(priced.total), checkoutChargeAmount: m(priced.checkoutCharge), totalTaxAmount: null, totalDutyAmount: null },
    delivery: null,
    deliveryGroups: () => connection([], {}, (x) => x),
    metafield: () => null,
    metafields: ({ identifiers }: { identifiers: unknown[] }) => identifiers.map(() => null),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

type LineInput = { merchandiseId: string; quantity?: number | null; attributes?: Attribute[] | null };
type LineUpdateInput = { id: string; quantity?: number | null; merchandiseId?: string | null; attributes?: Attribute[] | null };

const sameAttributes = (a: Attribute[], b: Attribute[]) =>
  a.length === b.length && a.every((x) => b.some((y) => y.key === x.key && y.value === x.value));

function addLines(cart: StoredCart, inputs: LineInput[], userErrors: UserError[], warnings: Warning[]) {
  inputs.forEach((input, index) => {
    const variantId = parseGid(input.merchandiseId);
    const found = findVariant(variantId);
    const quantity = input.quantity ?? 1;
    if (!found) {
      userErrors.push({ code: "INVALID", field: ["lines", String(index), "merchandiseId"], message: "The merchandise with id " + input.merchandiseId + " does not exist." });
      return;
    }
    if (quantity < 1) {
      userErrors.push({ code: "INVALID", field: ["lines", String(index), "quantity"], message: "Quantity must be at least 1." });
      return;
    }
    if (!isAvailable(found.variant)) {
      warnings.push({ code: "MERCHANDISE_OUT_OF_STOCK", message: `${found.product.title} is sold out.`, target: input.merchandiseId });
      return;
    }
    const attributes = input.attributes ?? [];
    const existing = cart.lines.find((l) => l.variantId === variantId && sameAttributes(l.attributes, attributes));
    const desired = (existing?.quantity ?? 0) + quantity;
    const capped = clampToStock(found.variant, desired, found.product.title, input.merchandiseId, warnings);
    if (existing) existing.quantity = capped;
    else cart.lines.push({ id: `${gid("CartLine", crypto.randomUUID())}?cart=${cart.token}`, variantId, quantity: capped, attributes });
  });
}

function clampToStock(variant: MockVariant, desired: number, title: string, target: string, warnings: Warning[]) {
  if (variant.continueSellingWhenOutOfStock || desired <= variant.inventory) return desired;
  warnings.push({
    code: "MERCHANDISE_NOT_ENOUGH_STOCK",
    message: `Only ${variant.inventory} of ${title} ${variant.inventory === 1 ? "is" : "are"} available. The quantity was adjusted.`,
    target,
  });
  return variant.inventory;
}

function payload(cart: StoredCart | null, ctx: MockRequestContext, userErrors: UserError[] = [], warnings: Warning[] = []) {
  if (cart) cart.updatedAt = now();
  return { cart: cart ? toCart(cart, ctx) : null, userErrors, warnings };
}

function withCart(cartId: string, ctx: MockRequestContext, fn: (cart: StoredCart, errors: UserError[], warnings: Warning[]) => void) {
  const cart = getStoredCart(cartId);
  if (!cart) return payload(null, ctx, [{ code: "INVALID", field: ["cartId"], message: "The specified cart does not exist." }]);
  const errors: UserError[] = [];
  const warnings: Warning[] = [];
  fn(cart, errors, warnings);
  return payload(cart, ctx, errors, warnings);
}

export function createCartRoots(ctx: MockRequestContext) {
  return {
    query: {
      cart: ({ id }: { id: string }) => {
        const cart = getStoredCart(id);
        return cart ? toCart(cart, ctx) : null;
      },
    },
    mutation: {
      cartCreate: ({ input }: { input?: { lines?: LineInput[]; note?: string; attributes?: Attribute[]; discountCodes?: string[]; giftCardCodes?: string[]; buyerIdentity?: { countryCode?: string; email?: string } } }) => {
        const cart: StoredCart = {
          token: randomToken(),
          lines: [],
          note: input?.note ?? "",
          attributes: input?.attributes ?? [],
          discountCodes: input?.discountCodes ?? [],
          giftCardCodes: [],
          buyerIdentity: { countryCode: input?.buyerIdentity?.countryCode ?? ctx.country, email: input?.buyerIdentity?.email ?? null, customerId: null },
          createdAt: now(),
          updatedAt: now(),
        };
        const errors: UserError[] = [];
        const warnings: Warning[] = [];
        addLines(cart, input?.lines ?? [], errors, warnings);
        carts.set(cart.token, cart);
        return payload(cart, ctx, errors, warnings);
      },
      cartLinesAdd: ({ cartId, lines }: { cartId: string; lines: LineInput[] }) =>
        withCart(cartId, ctx, (cart, errors, warnings) => addLines(cart, lines, errors, warnings)),
      cartLinesUpdate: ({ cartId, lines }: { cartId: string; lines: LineUpdateInput[] }) =>
        withCart(cartId, ctx, (cart, errors, warnings) => {
          lines.forEach((input, index) => {
            const line = cart.lines.find((l) => l.id === input.id);
            if (!line) {
              errors.push({ code: "INVALID", field: ["lines", String(index), "id"], message: "The cart line does not exist." });
              return;
            }
            if (input.merchandiseId) {
              const found = findVariant(parseGid(input.merchandiseId));
              if (!found) {
                errors.push({ code: "INVALID", field: ["lines", String(index), "merchandiseId"], message: "The merchandise does not exist." });
                return;
              }
              line.variantId = found.variant.id;
            }
            if (input.attributes) line.attributes = input.attributes;
            if (typeof input.quantity === "number") {
              if (input.quantity <= 0) {
                cart.lines = cart.lines.filter((l) => l !== line);
                return;
              }
              const found = findVariant(line.variantId)!;
              line.quantity = clampToStock(found.variant, input.quantity, found.product.title, line.id, warnings);
            }
          });
        }),
      cartLinesRemove: ({ cartId, lineIds }: { cartId: string; lineIds: string[] }) =>
        withCart(cartId, ctx, (cart) => {
          cart.lines = cart.lines.filter((l) => !lineIds.includes(l.id));
        }),
      cartDiscountCodesUpdate: ({ cartId, discountCodes }: { cartId: string; discountCodes: string[] }) =>
        withCart(cartId, ctx, (cart) => {
          cart.discountCodes = [...new Set(discountCodes.map((c) => c.trim()).filter(Boolean))];
        }),
      cartNoteUpdate: ({ cartId, note }: { cartId: string; note: string }) =>
        withCart(cartId, ctx, (cart, errors) => {
          if (note.length > 5000) errors.push({ code: "NOTE_TOO_LONG", field: ["note"], message: "Note is too long." });
          else cart.note = note;
        }),
      cartAttributesUpdate: ({ cartId, attributes }: { cartId: string; attributes: Attribute[] }) =>
        withCart(cartId, ctx, (cart) => {
          cart.attributes = attributes;
        }),
      cartBuyerIdentityUpdate: ({ cartId, buyerIdentity }: { cartId: string; buyerIdentity: { countryCode?: string; email?: string } }) =>
        withCart(cartId, ctx, (cart) => {
          if (buyerIdentity.countryCode) cart.buyerIdentity.countryCode = buyerIdentity.countryCode;
          if (buyerIdentity.email !== undefined) cart.buyerIdentity.email = buyerIdentity.email ?? null;
        }),
      cartGiftCardCodesAdd: ({ cartId, giftCardCodes }: { cartId: string; giftCardCodes: string[] }) =>
        withCart(cartId, ctx, (cart, errors) => applyGiftCards(cart, [...cart.giftCardCodes, ...giftCardCodes], errors)),
      cartGiftCardCodesUpdate: ({ cartId, giftCardCodes }: { cartId: string; giftCardCodes: string[] }) =>
        withCart(cartId, ctx, (cart, errors) => applyGiftCards(cart, giftCardCodes, errors)),
      cartGiftCardCodesRemove: ({ cartId, appliedGiftCardIds }: { cartId: string; appliedGiftCardIds: string[] }) =>
        withCart(cartId, ctx, (cart) => {
          const remove = appliedGiftCardIds.map(parseGid);
          cart.giftCardCodes = cart.giftCardCodes.filter((c) => !remove.includes(c));
        }),
    },
  };
}

function applyGiftCards(cart: StoredCart, codes: string[], errors: UserError[]) {
  const next: string[] = [];
  codes.forEach((raw, index) => {
    const code = raw.trim().toUpperCase();
    const card = GIFT_CARDS.find((g) => g.code === code);
    if (!card) {
      errors.push({ code: "INVALID", field: ["giftCardCodes", String(index)], message: `Gift card ${raw} is invalid.` });
    } else if (!card.enabled) {
      errors.push({ code: "INVALID", field: ["giftCardCodes", String(index)], message: `Gift card ending ${code.slice(-4)} has expired.` });
    } else if (card.balance <= 0) {
      errors.push({ code: "INVALID", field: ["giftCardCodes", String(index)], message: `Gift card ending ${code.slice(-4)} has no remaining balance.` });
    } else if (!next.includes(code)) {
      next.push(code);
    }
  });
  cart.giftCardCodes = next;
}

/** Used by the demo checkout page to render a summary of the cart. */
export function demoCheckoutSummary(token: string, countryCode = "US") {
  const cart = carts.get(token);
  if (!cart) return null;
  const market = findMarket(cart.buyerIdentity.countryCode ?? countryCode);
  return { cart, market, priced: priceCart(cart, market) };
}
