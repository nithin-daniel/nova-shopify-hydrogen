/**
 * Per-browser conveniences (CUSTOM storefront features, not Hydrogen APIs):
 * wishlist, comparison, recently viewed products and recent searches.
 *
 * Only public product handles are stored, never customer data. Every
 * localStorage access is wrapped so private windows / blocked storage
 * degrade to an empty list instead of crashing.
 */
import { useSyncExternalStore } from "react";

type ListKey = "wishlist" | "compare" | "recentlyViewed" | "recentSearches";
const LIMITS: Record<ListKey, number> = { wishlist: 50, compare: 4, recentlyViewed: 12, recentSearches: 6 };
const EVENT = "nova:local-store";
const EMPTY: readonly string[] = Object.freeze([]);
const cache = new Map<ListKey, readonly string[]>();

function read(key: ListKey): readonly string[] {
  if (cache.has(key)) return cache.get(key)!;
  let value: readonly string[] = EMPTY;
  try {
    const raw = window.localStorage.getItem(`nova:${key}`);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = Object.freeze(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    value = EMPTY;
  }
  cache.set(key, value);
  return value;
}

function write(key: ListKey, list: string[]) {
  const next = Object.freeze(list.slice(0, LIMITS[key]));
  cache.set(key, next);
  try {
    window.localStorage.setItem(`nova:${key}`, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep in memory for this page */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("nova:")) {
      cache.clear();
      callback();
    }
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalList(key: ListKey): readonly string[] {
  return useSyncExternalStore(subscribe, () => read(key), () => EMPTY);
}

export const localList = {
  get: (key: ListKey) => (typeof window === "undefined" ? EMPTY : read(key)),
  pushFront(key: ListKey, value: string) {
    write(key, [value, ...read(key).filter((v) => v !== value)]);
  },
  toggle(key: ListKey, value: string) {
    const list = read(key);
    if (list.includes(value)) write(key, list.filter((v) => v !== value));
    else if (key === "compare" && list.length >= LIMITS.compare) write(key, [...list.slice(1), value]);
    else write(key, [...list, value]);
  },
  remove(key: ListKey, value: string) {
    write(key, read(key).filter((v) => v !== value));
  },
  clear(key: ListKey) {
    write(key, []);
  },
};
