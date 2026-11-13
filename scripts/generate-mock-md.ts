/**
 * Regenerates the data tables in /mock.md from the fixtures in app/mocks.
 *   node scripts/generate-mock-md.ts
 * (Node 22.18+/24 strips TypeScript types natively.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("./") && !spec.endsWith(".ts") && ctx.parentURL?.includes("/app/mocks/")) spec += ".ts";
  return next(spec, ctx);
}`));

const m = await import("../app/mocks/index.ts");
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const rows = (head: string[], body: (string | number)[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...body.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const out: string[] = [];
out.push("### Products\n");
out.push(rows(["#", "Handle", "Title", "Type", "From", "Rating", "Collections", "Related", "Bought together"],
  m.ALL_PRODUCTS.map((p, i) => [i + 1, `\`${p.handle}\``, p.title, p.productType, money(Math.min(...p.variants.map((v) => v.price))),
    m.RATINGS[p.handle] ? `${m.RATINGS[p.handle][0]} (${m.RATINGS[p.handle][1]})` : "–",
    m.productCollections(p).map((c) => c.handle).join(", "), p.related.join(", "), p.complementary.join(", ")])));
out.push("\n### Variants, prices and inventory\n");
out.push(rows(["Product", "Variant id", "SKU", "Options", "Price", "Compare at", "Inventory", "State"],
  m.ALL_PRODUCTS.flatMap((p) => p.variants.map((v) => [p.handle, v.id, v.sku, Object.values(v.options).join(" / "), money(v.price),
    v.compareAtPrice ? money(v.compareAtPrice) : "", v.inventory,
    v.inventory === 0 ? (v.continueSellingWhenOutOfStock ? "Backorder" : "**Sold out**") : v.inventory <= 5 ? "Low stock" : "In stock"]))));
out.push("\nCombinations missing from the matrix (exercise `encodedVariantExistence`): `keyframe-75-keyboard` Midnight / Tactile.\n");
out.push("### Collections\n");
out.push(rows(["Handle", "Title", "Kind", "Rule", "Products"], m.COLLECTIONS.map((c) => [`\`${c.handle}\``, c.title, c.kind, c.productHandles ? "manual" : "smart (rule)", m.collectionProducts(c).length])));
out.push("\n### Customers\n");
out.push(rows(["Id", "Name", "Email", "Tags", "Addresses", "Orders", "Persona"], m.CUSTOMERS.map((c) => [c.id, `${c.firstName} ${c.lastName}`, c.email, c.tags.join(", "), c.addresses.length, m.ORDERS.filter((o) => o.customerId === c.id).length, c.persona])));
out.push("\n### Orders\n");
out.push(rows(["#", "Customer", "Date", "Currency", "Financial", "Fulfillment", "Lines", "Discount", "Tracking"], m.ORDERS.map((o) => {
  const c = m.findCustomer(o.customerId)!;
  return [o.number, `${c.firstName} ${c.lastName}`, o.processedAt.slice(0, 10), o.currencyCode, o.financialStatus, o.fulfillmentStatus,
    o.lineItems.map((l) => `${l.quantity}× ${l.productHandle}`).join("<br>"), o.discountCode ?? "",
    o.fulfillments.map((f) => `${f.carrier} ${f.latestShipmentStatus}`).join(", ")];
})));
out.push("\n### Discount codes\n");
out.push(rows(["Code", "Rule", "Minimum", "Scope", "Window", "Scenario"], m.DISCOUNT_CODES.map((d) => [`\`${d.code}\``,
  d.rule.kind === "percentage" ? `${d.rule.percent}% off` : d.rule.kind === "fixed" ? `${money(d.rule.amount)} off` : "Free shipping",
  d.minimumSubtotal ? money(d.minimumSubtotal) : "", d.eligibleProductHandles?.join(", ") ?? d.eligibleCollectionHandles?.map((h) => `collection:${h}`).join(", ") ?? "Order",
  `${d.startsAt.slice(0, 10)} → ${d.endsAt?.slice(0, 10) ?? "open"}`, d.usageNote ?? ""])));
out.push("\n### Automatic discounts\n");
out.push(rows(["Id", "Title", "Requires", "Percent"], m.AUTOMATIC_DISCOUNTS.map((d) => [d.id, d.title, d.requiresAllOf.join(" + "), `${d.percent}%`])));
out.push("\n### Gift cards\n");
out.push(rows(["Code", "Balance", "Enabled", "Note"], m.GIFT_CARDS.map((g) => [`\`${g.code}\``, money(g.balance), g.enabled ? "yes" : "no", g.note])));
out.push("\n### Markets (countries, currencies, languages)\n");
out.push(rows(["Country", "Currency", "Rate from USD", "Rounding", "Languages", "Tax included", "Free shipping over"], m.MARKETS.map((x) => [`${x.name} (${x.countryCode})`, x.currencyCode, x.rate, x.rounding, x.languages.join(", "), x.taxIncluded ? "yes" : "no", `${(x.freeShippingThreshold / 100).toFixed(0)} ${x.currencyCode}`])));
out.push("\n### Shipping options\n");
out.push(rows(["Rate", "Countries", "Price (USD base)", "Free over threshold", "Transit"], m.SHIPPING_RATES.map((s) => [s.title, s.countries.join(", "), money(s.price), s.freeOverThreshold ? "yes" : "no", `${s.minDays}–${s.maxDays} days`])));
out.push("\n### Tax examples\n");
out.push(rows(["Region", "Label", "Rate", "Included in price", "Note"], m.TAX_EXAMPLES.map((t) => [t.region, t.label, `${(t.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%`, t.included ? "yes" : "no", t.note])));

const file = new URL("../mock.md", import.meta.url);
const md = readFileSync(file, "utf8");
const start = "<!-- GENERATED:START -->", end = "<!-- GENERATED:END -->";
writeFileSync(file, md.slice(0, md.indexOf(start) + start.length) + "\n\n" + out.join("\n") + "\n\n" + md.slice(md.indexOf(end)));
console.log("mock.md tables regenerated");
