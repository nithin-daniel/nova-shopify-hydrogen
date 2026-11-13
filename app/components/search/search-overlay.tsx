/**
 * Search overlay with predictive search (skill: hydrogen-predictive-search).
 *
 * - Store, debounce, aborts and stale-response handling: Hydrogen's
 *   PredictiveSearchProvider → same-origin `/api/predictive-search`.
 * - The form submits `GET /search?q=` natively, so search works without JS
 *   (the header trigger is a real /search link).
 * - Every result link goes through `getPredictiveSearchItemUrl()` to keep
 *   Storefront API `trackingParameters`.
 * - Recent searches are a CUSTOM localStorage feature.
 */
import { getPredictiveSearchItemUrl, getSearchResultUrl, type PredictiveSearchDataFromHandlers } from "@shopify/hydrogen";
import { PredictiveSearchProvider, usePredictiveSearch, usePredictiveSearchActions, usePredictiveSearchForm } from "@shopify/hydrogen/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Icon, Price, ShopImage } from "~/components/ui";
import type { predictiveSearchHandlers } from "~/lib/shopify/handlers.server";
import { routeTemplates } from "~/lib/shopify/routes";
import { localList, useLocalList } from "~/lib/storefront/local-store";
import { Link, useLocale, useLocalizedPath } from "~/lib/storefront/locale";
import { closeSearch, SEARCH_DIALOG_ID } from "~/lib/storefront/search-drawer";

type SearchData = PredictiveSearchDataFromHandlers<typeof predictiveSearchHandlers>;

const POPULAR = ["headphones", "walnut", "keyboard", "desk lamp", "usb-c", "speaker"];

export function SearchOverlay() {
  const localize = useLocalizedPath();
  return (
    <PredictiveSearchProvider limit={6} searchAction={localize("/search")}>
      <SearchDialog />
    </PredictiveSearchProvider>
  );
}

function SearchDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { clear } = usePredictiveSearchActions();
  const { formProps, register } = usePredictiveSearchForm();
  const navigate = useNavigate();
  const localize = useLocalizedPath();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "open") requestAnimationFrame(() => inputRef.current?.focus());
      else clear(); // stale suggestions must not reappear on reopen
    };
    dialog.addEventListener("toggle", onToggle);
    return () => dialog.removeEventListener("toggle", onToggle);
  }, [clear]);

  return (
    <dialog ref={ref} id={SEARCH_DIALOG_ID} className="overlay" aria-label="Search" {...{ closedby: "any" }}>
      <div className="container-nova py-6 md:py-10">
        <form
          role="search"
          {...formProps({
            onSubmit: (event, term) => {
              // Enhance the native GET /search submit with client navigation.
              event.preventDefault();
              if (term) localList.pushFront("recentSearches", term);
              closeSearch();
              void navigate(localize(`/search?q=${encodeURIComponent(term)}`));
            },
          })}
          className="flex items-center gap-4 border-b border-ink pb-4"
        >
          <Icon name="search" size={26} className="shrink-0 text-stone" />
          <label htmlFor="predictive-q" className="sr-only">Search NOVA</label>
          <input
            {...register("query", { id: "predictive-q", placeholder: "Search headphones, walnut, lamps…" })}
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-2xl font-medium tracking-tight outline-none placeholder:text-stone/70 md:text-4xl"
          />
          <button type="button" onClick={closeSearch} className="btn btn-ghost btn-sm" aria-label="Close search">
            Close <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[0.7rem] text-stone md:inline">Esc</kbd>
          </button>
        </form>
        <div className="max-h-[calc(min(100dvh,46rem)-9rem)] overflow-y-auto pt-8">
          <Results />
        </div>
      </div>
    </dialog>
  );
}

function Results() {
  const { status, result, error } = usePredictiveSearch<SearchData>();
  const { search } = usePredictiveSearchActions();
  const recent = useLocalList("recentSearches");
  const { pathPrefix } = useLocale();
  const localize = useLocalizedPath();
  const term = result.term;
  const remember = () => term && localList.pushFront("recentSearches", term);

  if (status === "error") return <p role="alert" className="text-sm text-danger">Search is unavailable: {error}</p>;

  if (!term) {
    return (
      <div className="grid gap-10 md:grid-cols-3">
        {recent.length ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="eyebrow">Recent searches</h3>
              <button type="button" className="text-[0.75rem] text-stone underline" onClick={() => localList.clear("recentSearches")}>Clear</button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {recent.map((q) => <li key={q}><button type="button" className="chip" onClick={() => search(q)}>{q}</button></li>)}
            </ul>
          </div>
        ) : null}
        <div>
          <h3 className="eyebrow mb-3">Popular</h3>
          <ul className="flex flex-wrap gap-2">
            {POPULAR.map((q) => <li key={q}><button type="button" className="chip" onClick={() => search(q)}>{q}</button></li>)}
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-3">Browse</h3>
          <ul className="space-y-1.5 text-sm">
            {[["/collections/new-arrivals", "New arrivals"], ["/collections/best-sellers", "Best sellers"], ["/collections/gifts-under-100", "Gifts under $100"]].map(([to, label]) => (
              <li key={to}><Link to={to} onClick={closeSearch} className="link-underline">{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const { products, collections, articles, pages, queries } = result.items;
  const urlOpts = { term, routes: routeTemplates, pathPrefix };

  if (status !== "loading" && result.total === 0) {
    return (
      <div className="space-y-3" role="status">
        <p className="text-lg">No matches for “{term}”.</p>
        <p className="text-sm text-graphite">Try a broader term like “lamp” or “cable”, or browse <Link to="/collections" onClick={closeSearch} className="underline">all collections</Link>.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-10 md:grid-cols-[1fr_2.2fr] ${status === "loading" ? "opacity-60" : ""}`} aria-busy={status === "loading"}>
      <div className="space-y-8">
        {queries.length ? (
          <section>
            <h3 className="eyebrow mb-3">Suggestions</h3>
            <ul className="space-y-1.5">
              {queries.map((q) => (
                <li key={q.text}>
                  <a href={getPredictiveSearchItemUrl(q, { routes: routeTemplates, pathPrefix })} onClick={() => localList.pushFront("recentSearches", q.text)} className="text-lg [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-ink text-graphite hover:text-ink" dangerouslySetInnerHTML={{ __html: q.styledText }} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {collections.length ? (
          <section>
            <h3 className="eyebrow mb-3">Collections</h3>
            <ul className="space-y-1.5">
              {collections.map((c) => (
                <li key={c.id}><a href={getPredictiveSearchItemUrl(c, urlOpts)} onClick={remember} className="link-underline">{c.title}</a></li>
              ))}
            </ul>
          </section>
        ) : null}
        {[...articles, ...pages].length ? (
          <section>
            <h3 className="eyebrow mb-3">Journal &amp; pages</h3>
            <ul className="space-y-1.5 text-sm">
              {articles.map((a) => <li key={a.id}><a href={getPredictiveSearchItemUrl(a, urlOpts)} onClick={remember} className="link-underline">{a.title}</a></li>)}
              {pages.map((p) => <li key={p.id}><a href={getPredictiveSearchItemUrl(p, urlOpts)} onClick={remember} className="link-underline">{p.title}</a></li>)}
            </ul>
          </section>
        ) : null}
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="eyebrow">Products</h3>
          <a href={getSearchResultUrl({ baseUrl: localize("/search"), term })} onClick={remember} className="text-[0.8125rem] underline underline-offset-4">
            View all results
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <a href={getPredictiveSearchItemUrl(p, urlOpts)} onClick={remember} className="group block">
                <div className="overflow-hidden bg-bone">
                  <ShopImage image={p.selectedOrFirstAvailableVariant?.image ?? null} aspect={1} widths={[240, 360]} sizes="12rem" alt={p.title} className="transition-transform duration-700 group-hover:scale-105" />
                </div>
                <p className="mt-2 text-sm font-medium">{p.title}</p>
                <p className="text-[0.8125rem] text-graphite"><Price price={p.selectedOrFirstAvailableVariant?.price} /></p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
