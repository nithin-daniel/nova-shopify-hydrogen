import type { PublicRuntime } from "~/lib/shopify/env.server";
import { Link } from "~/lib/storefront/locale";

/** Always-visible indicator of where data comes from. */
export function DemoBadge({ runtime }: { runtime: PublicRuntime }) {
  const label = runtime.demoMode ? "Demo mode" : runtime.isMockShop ? "Live · mock.shop" : "Live store";
  const detail = runtime.demoMode ? "Local mock Storefront API, no Shopify credentials" : runtime.storeDomain;
  return (
    <Link
      to="/lab"
      className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-paper/95 py-1.5 pr-3.5 pl-2.5 text-[0.75rem] shadow-sm backdrop-blur transition hover:border-ink"
      title={detail}
    >
      <span className={`size-2 rounded-full ${runtime.demoMode ? "bg-amber" : "bg-moss"}`} aria-hidden="true" />
      <span className="font-medium">{label}</span>
      <span className="hidden text-stone sm:inline">· {detail}</span>
    </Link>
  );
}
