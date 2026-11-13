/**
 * NOVA's own consent banner, connected to Shopify Customer Privacy through
 * `consent: { mode: "custom-banner", setup }` (see lib/storefront/consent.ts).
 * Analytics destinations receive nothing until the shopper chooses.
 */
import { useEffect, useState } from "react";
import { chooseConsent, onConsentChange, readConsent } from "~/lib/storefront/consent";
import { Link } from "~/lib/storefront/locale";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(readConsent() === null);
    return onConsentChange((c) => setVisible(c === null));
  }, []);
  if (!visible) return null;
  return (
    <div role="region" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl animate-fade-up border border-line bg-paper p-5 shadow-2xl md:right-6 md:left-auto md:mx-0">
      <p className="text-sm leading-relaxed text-graphite">
        We use cookies for analytics to understand what you enjoy. Nothing is shared until you choose.{" "}
        <Link to="/policies/privacy-policy" className="underline underline-offset-4">Privacy policy</Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => chooseConsent("accepted")}>Accept</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => chooseConsent("rejected")}>Decline</button>
      </div>
    </div>
  );
}
