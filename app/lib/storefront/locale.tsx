import { forwardRef, useCallback } from "react";
import { Link as RouterLink, NavLink as RouterNavLink, useRouteLoaderData, type LinkProps, type NavLinkProps } from "react-router";
import type { AppLocale } from "~/lib/shopify/i18n";

type RootLocaleData = { locale: AppLocale };

const DEFAULT_LOCALE: AppLocale = { language: "EN", country: "US", pathPrefix: "", label: "United States", currency: "USD", intlLocale: "en-US" };

export function useLocale(): AppLocale {
  const data = useRouteLoaderData("root") as RootLocaleData | undefined;
  return data?.locale ?? DEFAULT_LOCALE;
}

/** Prefixes app-absolute paths with the active market's path prefix (e.g. /en-ca). */
export function localizePath(path: string, pathPrefix: string) {
  if (!pathPrefix || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === pathPrefix || path.startsWith(`${pathPrefix}/`) || path.startsWith(`${pathPrefix}?`)) return path;
  if (/^\/(api|account\/(login|logout|authorize|refresh))(\/|$|\?)/.test(path)) return path;
  return path === "/" ? pathPrefix : `${pathPrefix}${path}`;
}

export function useLocalizedPath() {
  const { pathPrefix } = useLocale();
  return useCallback((path: string) => localizePath(path, pathPrefix), [pathPrefix]);
}

function localizeTo(to: LinkProps["to"], prefix: string): LinkProps["to"] {
  if (typeof to === "string") return localizePath(to, prefix);
  if (to.pathname) return { ...to, pathname: localizePath(to.pathname, prefix) };
  return to;
}

/** React Router <Link> that keeps the shopper in their market. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  const { pathPrefix } = useLocale();
  return <RouterLink ref={ref} to={localizeTo(to, pathPrefix)} {...props} />;
});

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink({ to, ...props }, ref) {
  const { pathPrefix } = useLocale();
  return <RouterNavLink ref={ref} to={localizeTo(to, pathPrefix)} {...props} />;
});
