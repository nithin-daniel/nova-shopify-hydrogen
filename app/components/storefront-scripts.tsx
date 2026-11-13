/**
 * Renders Shopify's runtime scripts once in <head> (skill: hydrogen-setup step 7).
 *
 * Live mode uses Hydrogen's React `ShopifyScripts` component as-is.
 * DEMO_MODE renders the same descriptors from core `getShopifyScriptTags()`
 * (the documented framework-neutral path) minus PerfKit, and turns off
 * Shopify's storefront analytics delivery, so a fictional shop never sends
 * telemetry to Shopify. Standard Actions, the analytics bus and Customer Privacy
 * still load, so carts, `window.Shopify.actions` and consent gating are real.
 */
import { getShopifyScriptTags, initializeShopifyScripts, type ShopifyScriptsI18n, type ShopifyScriptsShop } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { createElement, useEffect } from "react";
import { useNavigate } from "react-router";
import { consentSetup } from "~/lib/storefront/consent";
import { routeTemplates } from "~/lib/shopify/routes";

export type ScriptsConfig = { shop: ShopifyScriptsShop; i18n: ShopifyScriptsI18n; demoMode: boolean };

const consent = { mode: "custom-banner" as const, setup: consentSetup };

export function StorefrontScripts({ config }: { config: ScriptsConfig }) {
  const navigate = useNavigate();
  const nav = (url: string) => void navigate(url);
  if (!config.demoMode) {
    return <ShopifyScripts shop={config.shop} i18n={config.i18n} routes={routeTemplates} navigate={nav} consent={consent} />;
  }
  return <DemoScripts config={config} navigate={nav} />;
}

function DemoScripts({ config, navigate }: { config: ScriptsConfig; navigate: (url: string) => void }) {
  useEffect(() => {
    void initializeShopifyScripts({ consent, routes: routeTemplates, navigate });
    // initialize once per page lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { tags } = getShopifyScriptTags({ shop: config.shop, i18n: config.i18n, consent, shopifyAnalytics: false });
  return (
    <>
      {tags
        .filter((t) => (t.attributes as Record<string, unknown> | undefined)?.id !== "shopify-perfkit")
        .map(({ tagName, attributes: rawAttributes, innerHTML }, index) => {
          const attributes = (rawAttributes ?? {}) as Record<string, unknown>;
          const props: Record<string, unknown> = { key: index };
          for (const [name, value] of Object.entries(attributes)) props[name === "crossorigin" ? "crossOrigin" : name] = value;
          if (attributes.async === true && typeof attributes.src === "string") props.onLoad = () => {};
          if (innerHTML) props.dangerouslySetInnerHTML = { __html: innerHTML };
          return createElement(tagName, props);
        })}
    </>
  );
}
