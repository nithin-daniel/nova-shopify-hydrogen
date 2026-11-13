import type { MockAutomaticDiscount, MockDiscountCode, MockGiftCard } from "./types";

/**
 * Discount scenarios evaluated by the mock cart. Each code exercises a
 * different cart behaviour; see `mock.md` for the scenario matrix.
 */
export const DISCOUNT_CODES: MockDiscountCode[] = [
  {
    code: "WELCOME10",
    title: "Welcome 10%",
    description: "10% off your entire order.",
    rule: { kind: "percentage", percent: 10 },
    startsAt: "2024-01-01T00:00:00Z",
    usageNote: "Order-level percentage discount, allocated across every line.",
    combinesWithOtherCodes: false,
  },
  {
    code: "SAVE20",
    title: "$20 off $100+",
    description: "$20 off orders of $100 or more.",
    rule: { kind: "fixed", amount: 2000 },
    minimumSubtotal: 10000,
    startsAt: "2024-01-01T00:00:00Z",
    usageNote: "Fixed amount with a minimum subtotal. Shows 'not applicable' below $100.",
    combinesWithOtherCodes: false,
  },
  {
    code: "NOVA25",
    title: "25% off $250+",
    description: "25% off orders of $250 or more.",
    rule: { kind: "percentage", percent: 25 },
    minimumSubtotal: 25000,
    startsAt: "2024-01-01T00:00:00Z",
    usageNote: "High-value threshold discount.",
    combinesWithOtherCodes: false,
  },
  {
    code: "SOUND15",
    title: "15% off Sound",
    description: "15% off headphones, speakers and hi-fi.",
    rule: { kind: "percentage", percent: 15 },
    eligibleCollectionHandles: ["sound"],
    startsAt: "2026-01-01T00:00:00Z",
    usageNote: "Collection-scoped: allocates only to Sound lines (line-item discount).",
    combinesWithOtherCodes: true,
  },
  {
    code: "DESKSET",
    title: "Desk set 10%",
    description: "10% off the Keyframe 75, Walnut Wrist Rest and Walnut Desk Organizer.",
    rule: { kind: "percentage", percent: 10 },
    eligibleProductHandles: ["keyframe-75-keyboard", "walnut-wrist-rest", "walnut-desk-organizer"],
    startsAt: "2026-01-01T00:00:00Z",
    usageNote: "Product-scoped line-item discount.",
    combinesWithOtherCodes: true,
  },
  {
    code: "FREESHIP",
    title: "Free shipping",
    description: "Free standard shipping on any order.",
    rule: { kind: "free_shipping" },
    startsAt: "2024-01-01T00:00:00Z",
    usageNote: "Shipping discount: applies at checkout, no change to merchandise subtotal.",
    combinesWithOtherCodes: true,
  },
  {
    code: "SUMMER25",
    title: "Summer 2025",
    description: "25% off everything (expired).",
    rule: { kind: "percentage", percent: 25 },
    startsAt: "2025-06-01T00:00:00Z",
    endsAt: "2025-08-31T23:59:59Z",
    usageNote: "Expired code. The cart keeps it with applicable: false.",
    combinesWithOtherCodes: false,
  },
];

/** Automatic discounts apply without a code (Storefront API `CartAutomaticDiscountAllocation`). */
export const AUTOMATIC_DISCOUNTS: MockAutomaticDiscount[] = [
  {
    id: "auto_studio_bundle",
    title: "Studio bundle: 10% off",
    description: "Buy the Studio Condenser Mic, Mic Mount Kit and Duo Audio Interface together and save 10% on all three.",
    requiresAllOf: ["studio-condenser-mic", "mic-mount-kit", "duo-audio-interface"],
    percent: 10,
  },
  {
    id: "auto_listening_bundle",
    title: "Listening set: 10% off",
    description: "Pair the Aria Studio Headphones with the Hi-Fi Headphone Amp and save 10% on both.",
    requiresAllOf: ["aria-studio-headphones", "hifi-headphone-amp"],
    percent: 10,
  },
];

export const GIFT_CARDS: MockGiftCard[] = [
  { code: "NOVAGIFT50", balance: 5000, currencyCode: "USD", enabled: true, note: "$50 balance" },
  { code: "NOVAGIFT250", balance: 25000, currencyCode: "USD", enabled: true, note: "$250 balance" },
  { code: "NOVAGIFT0", balance: 0, currencyCode: "USD", enabled: true, note: "Fully spent: rejected" },
  { code: "NOVAGIFTOLD", balance: 7500, currencyCode: "USD", enabled: false, expiresOn: "2025-12-31", note: "Expired: rejected" },
];
