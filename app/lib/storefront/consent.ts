/**
 * App-owned consent provider for `ShopifyScripts consent={{mode: "custom-banner"}}`
 * (skill: hydrogen-analytics, references/custom-consent.md).
 *
 * The NOVA banner is the "provider": it stores the shopper's choice, and the
 * setup callback below syncs that choice to Shopify's Customer Privacy API.
 * Hydrogen keeps every analytics destination buffered until setup resolves.
 */
import type { ConsentPreferences } from "@shopify/hydrogen";

const STORAGE_KEY = "nova:consent";
const EVENT = "nova:consent-change";

export type ConsentChoice = "accepted" | "rejected";

export function readConsent(): ConsentChoice | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function chooseConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: choice }));
}

export function resetConsent() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
}

export function onConsentChange(cb: (choice: ConsentChoice | null) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentChoice | null>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

const toPreferences = (choice: ConsentChoice): ConsentPreferences => {
  const allowed = choice === "accepted";
  return { analytics: allowed, marketing: allowed, preferences: allowed, sale_of_data: allowed };
};

export type ConsentStatus = { phase: "waiting" | "synced" | "error"; choice: ConsentChoice | null; error?: string };
export const consentStatus: ConsentStatus = { phase: "waiting", choice: null };
const STATUS_EVENT = "nova:consent-status";
const setStatus = (s: Partial<ConsentStatus>) => {
  Object.assign(consentStatus, s);
  window.dispatchEvent(new CustomEvent(STATUS_EVENT));
};
export const onConsentStatus = (cb: () => void) => {
  window.addEventListener(STATUS_EVENT, cb);
  return () => window.removeEventListener(STATUS_EVENT, cb);
};

/**
 * Hydrogen calls this once after the Customer Privacy API loads. It resolves
 * only after the shopper has a choice and Shopify has acknowledged it.
 */
export async function consentSetup() {
  const customerPrivacy = window.Shopify?.customerPrivacy;
  if (!customerPrivacy) throw new Error("Customer Privacy API unavailable");
  const sync = async (choice: ConsentChoice) => {
    try {
      await customerPrivacy.setTrackingConsent(toPreferences(choice));
      setStatus({ phase: "synced", choice, error: undefined });
    } catch (error) {
      setStatus({ phase: "error", choice, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  // Keep later changes (from the banner or the lab) in sync.
  onConsentChange((choice) => {
    if (choice) void sync(choice).catch(() => {});
  });
  const existing = readConsent();
  const choice = existing ?? (await new Promise<ConsentChoice>((resolve) => {
    const off = onConsentChange((c) => {
      if (c) {
        off();
        resolve(c);
      }
    });
  }));
  await sync(choice);
}
