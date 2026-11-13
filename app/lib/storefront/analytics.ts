import { AnalyticsEvent, type StorefrontAnalytics } from "@shopify/hydrogen";

export { AnalyticsEvent };

/** The analytics bus created by the Shopify script tags (`window.Shopify.analytics`). */
export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  return window.Shopify?.analytics ?? null;
}

export type InspectedEvent = { id: number; name: string; at: string; payload: unknown };

/** Events received by the NOVA inspector destination (after consent). Shown in /lab. */
export const inspectedEvents: InspectedEvent[] = [];
export const ANALYTICS_EVENT = "nova:analytics";

let seq = 0;
let installed = false;

/**
 * Registers a local destination that records every event the bus delivers.
 * Real integrations (GA4, Klaviyo, Meta) register the same way. The bus only
 * delivers after Customer Privacy consent allows analytics.
 */
export function installInspectorDestination() {
  const bus = getAnalytics();
  if (!bus || installed) return;
  installed = true;
  bus.addDestination({
    name: "nova-inspector",
    setup({ subscribe }) {
      const names = Object.values(AnalyticsEvent) as string[];
      const offs = names.map((name) =>
        subscribe(name as never, (payload: unknown) => {
          const entry = { id: ++seq, name, at: new Date().toISOString(), payload };
          inspectedEvents.unshift(entry);
          inspectedEvents.length = Math.min(inspectedEvents.length, 200);
          window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: entry }));
        }),
      );
      return () => offs.forEach((off) => off());
    },
  });
}
