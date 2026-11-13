import { Suspense, useEffect, useRef, useState } from "react";
import { Await, useLocation } from "react-router";
import { useRootData } from "~/lib/storefront/root-data";
import { Icon } from "~/components/ui";
import { useCart } from "~/lib/storefront/cart";
import { CART_DRAWER_ID, openCartDrawer } from "~/lib/storefront/cart-drawer";
import { useLocalList } from "~/lib/storefront/local-store";
import { Link, NavLink, useLocale } from "~/lib/storefront/locale";
import { formatPrice } from "~/lib/storefront/money";
import { openSearch, SEARCH_DIALOG_ID } from "~/lib/storefront/search-drawer";
import { FREE_SHIPPING_THRESHOLD_MINOR } from "~/lib/storefront/shipping";

const NAV_HANDLES = ["sound", "studio", "desk", "light", "power", "mobile"];

export function useNavCollections() {
  const data = useRootData();
  const all = data?.layout?.collections.nodes ?? [];
  const preferred = NAV_HANDLES.map((h) => all.find((c) => c.handle === h)).filter((c): c is (typeof all)[number] => Boolean(c));
  return preferred.length ? preferred : all.slice(0, 6);
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[1.35rem] leading-none font-semibold tracking-[0.32em] ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="-mt-0.5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3.2" fill="var(--color-ember)" />
      </svg>
      NOVA
    </span>
  );
}

function AnnouncementBar() {
  const { currency, intlLocale } = useLocale();
  const threshold = FREE_SHIPPING_THRESHOLD_MINOR[currency];
  return (
    <div className="bg-ink text-paper">
      <p className="container-nova flex h-9 items-center justify-center gap-6 text-[0.75rem] tracking-wide">
        <span>
          Free shipping over {threshold ? formatPrice({ amount: (threshold / 100).toFixed(2), currencyCode: currency }, intlLocale, { trim: true }) : "our threshold"}
        </span>
        <span className="hidden text-paper/40 sm:inline">/</span>
        <span className="hidden sm:inline">30-day returns</span>
        <span className="hidden text-paper/40 md:inline">/</span>
        <span className="hidden md:inline">Two-year warranty on everything</span>
      </p>
    </div>
  );
}

function CartTrigger() {
  const count = useCart((s) => s.data.totalQuantity);
  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        openCartDrawer();
      }}
      aria-controls={CART_DRAWER_ID}
      aria-haspopup="dialog"
      className="btn btn-ghost btn-icon relative"
    >
      <Icon name="bag" />
      <span className="sr-only">Cart, {count} {count === 1 ? "item" : "items"}</span>
      {count > 0 ? (
        <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-ember px-1 text-[0.625rem] leading-[1.15rem] font-semibold text-paper tabular-nums">
          {count}
        </span>
      ) : null}
    </a>
  );
}

export function MarketSelector({ compact = false }: { compact?: boolean }) {
  const data = useRootData();
  const { country, label, currency } = useLocale();
  if (!data) return null;
  return (
    <details className="group relative">
      <summary className={`btn btn-ghost btn-sm gap-1.5 ${compact ? "px-2" : ""}`} aria-label={`Market: ${label}, ${currency}. Change market`}>
        <Icon name="globe" size={16} />
        <span className="text-[0.8125rem]">{country} · {currency}</span>
      </summary>
      <ul className="absolute right-0 z-50 mt-2 w-60 border border-line bg-paper p-2 shadow-xl">
        {data.markets.map((m) => (
          <li key={`${m.country}-${m.language}`}>
            {/* Full document load: the market changes the whole request context. */}
            <a href={m.href} className={`flex items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-bone ${m.country === country ? "font-medium" : ""}`} aria-current={m.country === country ? "true" : undefined}>
              <span>{m.label}</span>
              <span className="text-stone">{m.currency} · {m.language}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const collections = useNavCollections();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="drawer drawer-left" aria-label="Menu" onClose={onClose} {...{ closedby: "any" }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <Wordmark />
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-2" aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Mobile">
          <ul className="space-y-1">
            {collections.map((c) => (
              <li key={c.id}>
                <Link to={`/collections/${c.handle}`} onClick={onClose} className="flex items-center justify-between py-2.5 text-3xl font-medium tracking-tight">
                  {c.title} <Icon name="chevron" className="text-stone" />
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6 text-sm">
            {[
              ["/collections/new-arrivals", "New arrivals"],
              ["/collections/best-sellers", "Best sellers"],
              ["/bundle", "Build a bundle"],
              ["/collections", "All collections"],
              ["/blogs/journal", "Journal"],
              ["/lab", "Hydrogen lab"],
              ["/wishlist", "Wishlist"],
              ["/account", "Account"],
            ].map(([to, label]) => (
              <li key={to}><Link to={to} onClick={onClose} className="text-graphite hover:text-ink">{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line px-4 py-3"><MarketSelector /></div>
      </div>
    </dialog>
  );
}

export function SiteHeader() {
  const collections = useNavCollections();
  const data = useRootData();
  const wishlist = useLocalList("wishlist");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <>
      <AnnouncementBar />
      <header className={`sticky top-0 z-40 bg-paper/90 backdrop-blur-md transition-[border-color,box-shadow] ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
        <div className="container-nova flex h-16 items-center gap-4">
          <button type="button" className="btn btn-ghost btn-icon -ml-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-haspopup="dialog">
            <Icon name="menu" />
          </button>
          <Link to="/" aria-label="NOVA home" className="shrink-0"><Wordmark /></Link>
          <nav aria-label="Primary" className="ml-8 hidden lg:block">
            <ul className="flex items-center gap-7 text-[0.875rem]">
              {collections.map((c) => (
                <li key={c.id}>
                  <NavLink to={`/collections/${c.handle}`} prefetch="intent" className={({ isActive }) => `link-underline py-1 ${isActive ? "text-ink" : "text-graphite hover:text-ink"}`}>
                    {c.title}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink to="/lab" className="inline-flex items-center gap-1.5 text-graphite hover:text-ink">
                  <span className="size-1.5 rounded-full bg-ember" aria-hidden="true" /> Lab
                </NavLink>
              </li>
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-0.5">
            <div className="hidden md:block"><MarketSelector /></div>
            <a
              href="/search"
              onClick={(e) => {
                e.preventDefault();
                openSearch();
              }}
              aria-controls={SEARCH_DIALOG_ID}
              aria-haspopup="dialog"
              className="btn btn-ghost btn-icon"
            >
              <Icon name="search" />
              <span className="sr-only">Search</span>
            </a>
            <Link to="/wishlist" className="btn btn-ghost btn-icon relative hidden sm:inline-flex">
              <Icon name="heart" />
              <span className="sr-only">Wishlist, {wishlist.length} items</span>
              {wishlist.length ? <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-ember" /> : null}
            </Link>
            <Link to="/account" className="btn btn-ghost btn-icon relative">
              <Icon name="user" />
              <span className="sr-only">Account</span>
              <Suspense fallback={null}>
                <Await resolve={data?.isLoggedIn} errorElement={null}>
                  {(loggedIn) => (loggedIn ? <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-moss" /> : null)}
                </Await>
              </Suspense>
            </Link>
            <CartTrigger />
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
