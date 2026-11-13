/**
 * Collection & search browsing (skill: hydrogen-collection-browser, React).
 *
 * - Hydrogen's CollectionProvider owns browse intent (filters, sort, status);
 *   products come from the route loader.
 * - The form is a real `method="get"` form with an explicit `action`, so every
 *   control works without JavaScript; hydrated, it navigates without scroll reset.
 * - Filter identity is the Storefront API `FilterValue.input`; param names come
 *   from `serializeCollectionParams`, chips from `getFilterRemovalUrl`.
 */
import {
  formatMoney,
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  parseCollectionParams,
  serializeCollectionParams,
  type ProductFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { ProductGrid } from "~/components/product/product-card";
import { Icon } from "~/components/ui";
import type { ProductCardData } from "~/lib/queries/catalog.server";
import { useLocale } from "~/lib/storefront/locale";

export type BrowseFilter = {
  id: string;
  label: string;
  type: "LIST" | "PRICE_RANGE" | "BOOLEAN";
  presentation?: "IMAGE" | "SWATCH" | "TEXT" | null;
  values: { id: string; label: string; count: number; input: unknown; swatch?: { color?: string | null } | null }[];
};

export const COLLECTION_SORTS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Newest", value: getSortByValue("CREATED", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Alphabetical, A–Z", value: getSortByValue("TITLE", false) },
];
export const SEARCH_SORTS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

type BrowseProps = {
  handle: string;
  dataSearch: string;
  action: string;
  products: ProductCardData[];
  filters: BrowseFilter[];
  currencyCode: string;
  sorts: { label: string; value: string }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  totalLabel?: string;
  hiddenFields?: Record<string, string>;
  empty?: ReactNode;
};

export function Browse(props: BrowseProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (
    <CollectionProvider
      data={{ handle: props.handle, dataSearch: props.dataSearch }}
      urlSearch={searchParams.toString()}
      onChange={(search) => navigate({ search }, { replace: searchParams.size > 0, preventScrollReset: true })}
    >
      <BrowseForm {...props} />
    </CollectionProvider>
  );
}

const submit = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

function parseInput(input: unknown): ProductFilter | null {
  try {
    return (typeof input === "string" ? JSON.parse(input) : input) as ProductFilter;
  } catch {
    return null;
  }
}

function inputParam(input: unknown) {
  const filter = parseInput(input);
  if (!filter) return null;
  const entries = [...serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false })];
  return entries.length === 1 ? { name: entries[0][0], value: entries[0][1] } : null;
}

function describeFilter(filter: ProductFilter, filters: BrowseFilter[], format: (n: number) => string) {
  if (filter.price) return `${filter.price.min != null ? format(Number(filter.price.min)) : "Any"} – ${filter.price.max != null ? format(Number(filter.price.max)) : "Any"}`;
  for (const group of filters) {
    for (const value of group.values) {
      const parsed = parseInput(value.input);
      if (parsed && JSON.stringify(parsed) === JSON.stringify(filter)) return value.label;
      if (parsed?.variantOption && filter.variantOption && parsed.variantOption.value === filter.variantOption.value) return value.label;
    }
  }
  if (filter.available !== undefined) return filter.available ? "In stock" : "Out of stock";
  return Object.values(filter).map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(" ");
}

function BrowseForm({ action, products, filters, currencyCode, sorts, pageInfo, totalLabel, hiddenFields, empty, dataSearch }: BrowseProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const loading = state.status === "loading";
  const { intlLocale } = useLocale();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currentSort = useMemo(() => {
    if (!state.sortKey) return sorts[0].value;
    const value = getSortByValue(state.sortKey, state.reverse);
    return sorts.some((s) => s.value === value) ? value : sorts[0].value;
  }, [state.sortKey, state.reverse, sorts]);
  const format = (n: number) => formatMoney({ amount: String(n), currencyCode }, { locale: intlLocale }).withoutTrailingZeros;
  const activeCount = state.filters.length;
  const params = serializeCollectionParams(state);

  return (
    <form {...formProps()} method="get" action={action} className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

      <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`} aria-label="Filters">
        <div className="space-y-8 lg:sticky lg:top-24">
          {filters.map((group) => (
            <fieldset key={group.id} className="border-t border-line pt-5">
              <legend className="mb-3 text-[0.8125rem] font-medium">{group.label}</legend>
              {group.type === "PRICE_RANGE" ? (
                <PriceRange activeFilters={state.filters} currencyCode={currencyCode} />
              ) : (
                <ul className={group.presentation === "SWATCH" ? "flex flex-wrap gap-2" : "space-y-2.5"}>
                  {group.values.map((value) => {
                    const param = inputParam(value.input);
                    if (!param) return null;
                    const checked = isFilterInputActive(state.filters, typeof value.input === "string" ? value.input : JSON.stringify(value.input));
                    const id = `f-${value.id}`;
                    const disabled = value.count === 0 && !checked;
                    if (group.presentation === "SWATCH" && value.swatch?.color) {
                      return (
                        <li key={value.id}>
                          <input id={id} type="checkbox" name={param.name} value={param.value} checked={checked} onChange={submit} disabled={disabled} className="peer sr-only" />
                          <label htmlFor={id} title={`${value.label} (${value.count})`} className={`block size-7 rounded-full ring-1 ring-ink/15 ring-offset-2 ring-offset-paper peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ember ${disabled ? "opacity-30" : ""}`} style={{ backgroundColor: value.swatch.color }}>
                            <span className="sr-only">{value.label} ({value.count})</span>
                          </label>
                        </li>
                      );
                    }
                    return (
                      <li key={value.id}>
                        <label htmlFor={id} className={`flex items-center gap-2.5 text-sm ${disabled ? "text-stone" : "text-graphite"}`}>
                          <input
                            id={id}
                            type="checkbox"
                            className="checkbox"
                            name={param.name}
                            value={param.value}
                            checked={checked}
                            disabled={disabled}
                            onChange={(e) => {
                              if (group.id === "filter.v.availability" && e.currentTarget.checked) {
                                // Single-choice: availability values share one param name.
                                e.currentTarget.form?.querySelectorAll<HTMLInputElement>(`input[name="${param.name}"]`).forEach((el) => {
                                  if (el !== e.currentTarget) el.checked = false;
                                });
                              }
                              submit(e);
                            }}
                          />
                          <span className="flex-1">{value.label}</span>
                          <span className="text-[0.75rem] text-stone tabular-nums">{value.count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          ))}
          <noscript>
            <button type="submit" className="btn btn-primary btn-sm w-full">Apply filters</button>
          </noscript>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-4">
          <button type="button" className="btn btn-secondary btn-sm lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
            Filters {activeCount ? <span className="rounded-full bg-ink px-1.5 text-[0.7rem] text-paper">{activeCount}</span> : null}
          </button>
          <p className="text-[0.8125rem] text-stone" aria-live="polite">{loading ? "Updating…" : totalLabel}</p>
          <label className="ml-auto flex items-center gap-2 text-[0.8125rem] text-graphite">
            <span>Sort</span>
            <span className="relative">
              <select name="sort_by" value={currentSort} onChange={submit} className="appearance-none bg-transparent py-1 pr-6 font-medium text-ink outline-none">
                {sorts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Icon name="chevronDown" size={14} className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2" />
            </span>
          </label>
        </div>

        {activeCount ? (
          <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
            {state.filters.map((filter, i) => {
              const removal = getFilterRemovalUrl(params, filter);
              return (
                <li key={i}>
                  <a href={removal === "?" ? action : `${action}${removal}`} className="chip" aria-label={`Remove filter ${describeFilter(filter, filters, format)}`}>
                    {describeFilter(filter, filters, format)} <Icon name="close" size={12} />
                  </a>
                </li>
              );
            })}
            <li>
              <a href={`${action}${hiddenFields?.q ? `?q=${encodeURIComponent(hiddenFields.q)}` : ""}`} className="ml-1 text-[0.8125rem] text-stone underline underline-offset-4 hover:text-ink">Clear all</a>
            </li>
          </ul>
        ) : null}

        {products.length ? (
          <PaginatedGrid key={dataSearch} products={products} pageInfo={pageInfo} pending={loading} action={action} />
        ) : (
          empty
        )}
      </div>
    </form>
  );
}

function PaginatedGrid({ products, pageInfo, pending, action }: { products: ProductCardData[]; pageInfo: BrowseProps["pageInfo"]; pending: boolean; action: string }) {
  const fetcher = useFetcher<{ products: ProductCardData[]; pageInfo: BrowseProps["pageInfo"] }>();
  const [extra, setExtra] = useState<ProductCardData[]>([]);
  const [info, setInfo] = useState(pageInfo);
  const [searchParams] = useSearchParams();
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.data && fetcher.data !== handled.current) {
      handled.current = fetcher.data;
      setExtra((e) => [...e, ...fetcher.data!.products]);
      setInfo(fetcher.data.pageInfo);
    }
  }, [fetcher.data]);

  const next = new URLSearchParams(searchParams);
  next.delete("before");
  if (info.endCursor) next.set("after", info.endCursor);
  const href = `${action}?${next.toString()}`;

  return (
    <>
      <ProductGrid products={[...products, ...extra]} pending={pending} priorityCount={4} />
      {info.hasNextPage ? (
        <div className="mt-14 flex justify-center">
          {/* A plain GET link: without JS it loads the next page server-side. */}
          <a
            href={href}
            className="btn btn-secondary"
            onClick={(e) => {
              e.preventDefault();
              void fetcher.load(href);
            }}
            aria-busy={fetcher.state !== "idle"}
          >
            {fetcher.state !== "idle" ? "Loading…" : "Load more"}
          </a>
        </div>
      ) : null}
    </>
  );
}

const PRICE_LOCALE_FALLBACK = "en-US";

function PriceRange({ activeFilters, currencyCode }: { activeFilters: ProductFilter[]; currencyCode: string }) {
  const { intlLocale } = useLocale();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const price = activeFilters.find((f) => f.price)?.price;
  const min = price?.min ?? "";
  const max = price?.max ?? "";
  const symbol = formatMoney({ amount: "0", currencyCode }, { locale: intlLocale || PRICE_LOCALE_FALLBACK }).currencyNarrowSymbol;

  useEffect(() => {
    for (const [input, value] of [[minRef.current, min], [maxRef.current, max]] as const) {
      if (!input) continue;
      const matches = value === "" ? input.value === "" : input.value !== "" && Number(input.value) === Number(value);
      if (!matches) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        input.value = String(value);
      }
    }
  }, [min, max]);

  useEffect(() => {
    const cancel = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    const restore = () => {
      cancel();
      const { filters } = parseCollectionParams(new URLSearchParams(window.location.search));
      const p = filters.find((f) => f.price)?.price;
      if (minRef.current) minRef.current.value = String(p?.min ?? "");
      if (maxRef.current) maxRef.current.value = String(p?.max ?? "");
    };
    const form = minRef.current?.form;
    form?.addEventListener("submit", cancel);
    window.addEventListener("popstate", restore);
    return () => {
      form?.removeEventListener("submit", cancel);
      window.removeEventListener("popstate", restore);
      cancel();
    };
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (timer.current) clearTimeout(timer.current);
    const form = e.currentTarget.form;
    timer.current = setTimeout(() => {
      timer.current = null;
      form?.requestSubmit();
    }, 350);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {(
        [
          ["filter.v.price.gte", minRef, min, `Minimum price in ${currencyCode}`, "Min"],
          ["filter.v.price.lte", maxRef, max, `Maximum price in ${currencyCode}`, "Max"],
        ] as const
      ).map(([name, ref, value, label, placeholder]) => (
        <span key={name} className="inline-flex items-center gap-1 border-b border-line focus-within:border-ink">
          <span aria-hidden="true" className="text-sm text-stone">{symbol}</span>
          <input ref={ref} type="number" name={name} min="0" step="any" defaultValue={value} aria-label={label} placeholder={placeholder} onChange={onChange} className="min-h-9 w-full min-w-0 bg-transparent text-sm outline-none" />
        </span>
      ))}
    </div>
  );
}
