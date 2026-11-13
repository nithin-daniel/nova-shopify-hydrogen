/**
 * Route-level analytics (skill: hydrogen-analytics, React reference).
 * PAGE_VIEWED fires on initial load and every client navigation, keyed by
 * pathname + search. Product / collection / search / cart views are published
 * by their routes with the `useViewEvent` helper below.
 */
import { useEffect } from "react";
import { useLocation } from "react-router";
import { AnalyticsEvent, getAnalytics } from "~/lib/storefront/analytics";

export function AnalyticsTracker() {
  const location = useLocation();
  const key = location.pathname + location.search;
  useEffect(() => {
    getAnalytics()?.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [key]);
  return null;
}

/** Publishes a view event once per `identity` change (e.g. product handle). */
export function useViewEvent(publish: () => void, identity: string | null | undefined) {
  useEffect(() => {
    if (identity) publish();
    // publish is recreated every render; identity is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);
}
