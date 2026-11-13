/**
 * Shopify CDN image sizing (skill: hydrogen-image). Hydrogen 2026.10 ships no
 * Image component: size CDN URLs and render plain <img>.
 */
type ShopifyImageOptions = { width?: number; height?: number; crop?: "center" | "top" | "bottom" | "left" | "right" };

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];
const isShopifyImageHost = (hostname: string) => SHOPIFY_CDN_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));

export function shopifyImageUrl(url: string, options: ShopifyImageOptions = {}) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!isShopifyImageHost(parsed.hostname)) return url;
  if (options.width) parsed.searchParams.set("width", String(options.width));
  if (options.height) parsed.searchParams.set("height", String(options.height));
  if (options.crop) parsed.searchParams.set("crop", options.crop);
  return parsed.toString();
}

/** Responsive `srcset` at fixed widths, preserving the aspect ratio via height + crop. */
export function responsiveSrcSet(url: string, widths: number[], aspect?: number, crop: ShopifyImageOptions["crop"] = "center") {
  return widths
    .map((w) => `${shopifyImageUrl(url, { width: w, height: aspect ? Math.round(w / aspect) : undefined, crop: aspect ? crop : undefined })} ${w}w`)
    .join(", ");
}
