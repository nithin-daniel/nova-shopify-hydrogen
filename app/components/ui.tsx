import type { MoneyV2 } from "@shopify/hydrogen";
import type { ReactNode, SVGProps } from "react";
import { formatPrice, isDiscounted } from "~/lib/storefront/money";
import { responsiveSrcSet, shopifyImageUrl } from "~/lib/storefront/image";
import { useLocale } from "~/lib/storefront/locale";

// ---------------------------------------------------------------------------
// Icons (1.5px stroke, 24px grid)
// ---------------------------------------------------------------------------

const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 8h16M4 16h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  arrowLeft: <path d="M19 12H5m5-5-5 5 5 5" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  compare: <path d="M8 4v16M16 4v16M4 8l4-4 4 4M12 16l4 4 4-4" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></>,
  return: <path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" />,
  shield: <path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6l-7-3Z" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  flask: <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
  tag: <><path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5-8.5-8.5Z" /><circle cx="8" cy="8.5" r="1.3" /></>,
  box: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18M4 7.5l8 4.5 8-4.5" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {paths[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Images: plain <img> + Shopify CDN transforms (Hydrogen ships no Image component)
// ---------------------------------------------------------------------------

type ImageLike = { url: string; altText?: string | null; width?: number | null; height?: number | null };

export function ShopImage({
  image,
  alt,
  aspect = 4 / 5,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  widths = [320, 480, 640, 768],
  className = "",
  loading = "lazy",
  crop = "center",
}: {
  image: ImageLike | null | undefined;
  alt?: string;
  aspect?: number;
  sizes?: string;
  widths?: number[];
  className?: string;
  loading?: "lazy" | "eager";
  crop?: "center" | "top" | "bottom";
}) {
  if (!image?.url) {
    return <div className={`bg-bone ${className}`} style={{ aspectRatio: aspect }} role="img" aria-label={alt ?? "Image unavailable"} />;
  }
  const w = widths.at(-1)!;
  return (
    <img
      src={shopifyImageUrl(image.url, { width: w, height: Math.round(w / aspect), crop })}
      srcSet={responsiveSrcSet(image.url, widths, aspect, crop)}
      sizes={sizes}
      alt={alt ?? image.altText ?? ""}
      width={w}
      height={Math.round(w / aspect)}
      loading={loading}
      decoding="async"
      fetchPriority={loading === "eager" ? "high" : undefined}
      className={`block h-full w-full object-cover ${className}`}
      style={{ aspectRatio: aspect }}
    />
  );
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export function Price({
  price,
  compareAt,
  className = "",
  pending = false,
  from = false,
}: {
  price: MoneyV2 | null | undefined;
  compareAt?: MoneyV2 | null;
  className?: string;
  pending?: boolean;
  from?: boolean;
}) {
  const { intlLocale } = useLocale();
  if (!price) return null;
  const sale = isDiscounted(price, compareAt);
  return (
    <span className={`inline-flex items-baseline gap-2 tabular-nums ${pending ? "is-pending" : ""} ${className}`}>
      {from ? <span className="opacity-75">From</span> : null}
      <span className={sale ? "text-ember" : undefined}>{formatPrice(price, intlLocale)}</span>
      {sale ? (
        <s className="text-stone decoration-stone/60">
          <span className="sr-only">Regular price </span>
          {formatPrice(compareAt, intlLocale)}
        </s>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ratings (from the standard reviews.rating / reviews.rating_count metafields)
// ---------------------------------------------------------------------------

export function parseRating(rating?: { value: string } | null, count?: { value: string } | null) {
  if (!rating?.value) return null;
  try {
    const parsed = JSON.parse(rating.value) as { value: string; scale_max?: string };
    return { value: Number(parsed.value), max: Number(parsed.scale_max ?? 5), count: count ? Number(count.value) : 0 };
  } catch {
    return null;
  }
}

export function Stars({ value, max = 5, size = 13 }: { value: number; max?: number; size?: number }) {
  return (
    <span className="relative inline-flex" role="img" aria-label={`Rated ${value.toFixed(1)} out of ${max}`}>
      <span className="flex text-line" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <Icon key={i} name="star" size={size} fill="currentColor" strokeWidth={0} />)}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-ink" style={{ width: `${(value / max) * 100}%` }} aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <Icon key={i} name="star" size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />)}
      </span>
    </span>
  );
}

export function RatingSummary({ rating, compact = false }: { rating: ReturnType<typeof parseRating>; compact?: boolean }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-graphite">
      <Stars value={rating.value} max={rating.max} />
      <span className="tabular-nums">{rating.value.toFixed(1)}</span>
      {!compact ? <span className="text-stone">({rating.count.toLocaleString("en-US")})</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function SectionHeading({ eyebrow, title, accent, action, className = "" }: { eyebrow?: string; title: string; accent?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12 ${className}`}>
      <div>
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="display text-display-sm">
          {title} {accent ? <span className="serif-accent">{accent}</span> : null}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-y border-line py-16">
      <h2 className="display text-3xl">{title}</h2>
      {body ? <p className="max-w-md text-graphite">{body}</p> : null}
      {children}
    </div>
  );
}

export function StockMessage({ available, quantity, className = "" }: { available: boolean; quantity?: number | null; className?: string }) {
  let tone = "bg-moss";
  let text = "In stock, ships in 1–2 business days";
  if (!available) {
    tone = "bg-stone";
    text = "Sold out";
  } else if (typeof quantity === "number" && quantity <= 0) {
    tone = "bg-amber";
    text = "Backorder: ships in 2–3 weeks";
  } else if (typeof quantity === "number" && quantity <= 5) {
    tone = "bg-ember";
    text = `Only ${quantity} left`;
  }
  return (
    <p className={`inline-flex items-center gap-2 text-[0.8125rem] text-graphite ${className}`} role="status">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden="true" />
      {text}
    </p>
  );
}
