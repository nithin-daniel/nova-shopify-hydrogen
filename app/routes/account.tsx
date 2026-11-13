/** Account layout: signed-out panel or account navigation + child routes. */
import { NavLink as RouterNavLink, Outlet } from "react-router";
import type { Route } from "./+types/account";
import { shopifyContext } from "~/lib/shopify/context";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";

export async function loader({ context }: Route.LoaderArgs) {
  const { customer, demoMode } = context.get(shopifyContext);
  // isLoggedIn() is read-only: it never refreshes tokens.
  return { loggedIn: await customer.isLoggedIn(), demoMode, mode: customer.mode };
}

export const meta: Route.MetaFunction = () => [{ title: "Account | NOVA" }, { name: "robots", content: "noindex" }];

export default function AccountLayout({ loaderData }: Route.ComponentProps) {
  const localize = useLocalizedPath();
  if (!loaderData.loggedIn) {
    return (
      <section className="container-nova grid min-h-[50vh] content-center gap-6 pt-12">
        <p className="eyebrow">Account</p>
        <h1 className="display max-w-2xl text-display-sm">Orders, addresses and <span className="serif-accent">everything in between.</span></h1>
        <p className="max-w-lg text-graphite">Sign in to track deliveries, manage addresses and reorder in a click.</p>
        <div>
          {/* Full-document navigation: the live login handler redirects to Shopify. */}
          <a href="/account/login?return_to=/account" className="btn btn-primary">Sign in</a>
        </div>
        {loaderData.mode === "unavailable" ? <p className="text-sm text-stone">Customer Account API is not configured for this store.</p> : null}
      </section>
    );
  }
  const nav = [
    ["/account", "Overview"],
    ["/account/orders", "Orders"],
    ["/account/addresses", "Addresses"],
  ] as const;
  return (
    <section className="container-nova grid gap-10 pt-10 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <p className="eyebrow mb-4">Account {loaderData.demoMode ? <span className="badge badge-amber ml-1 normal-case tracking-normal">Demo profile</span> : null}</p>
        <nav aria-label="Account">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {nav.map(([to, label]) => (
              <li key={to}>
                <RouterNavLink to={localize(to)} end={to === "/account"} className={({ isActive }) => `block rounded-full px-4 py-2 text-sm whitespace-nowrap lg:rounded-none lg:border-l-2 lg:px-4 ${isActive ? "bg-ink text-paper lg:border-ink lg:bg-transparent lg:font-medium lg:text-ink" : "text-graphite hover:text-ink lg:border-transparent"}`}>
                  {label}
                </RouterNavLink>
              </li>
            ))}
            <li className="lg:mt-6">
              {/* Plain HTML form: logout returns a raw redirect and must work without JS. */}
              <form method="post" action={loaderData.demoMode ? "/account/demo-logout" : "/account/logout"}>
                <button type="submit" className="px-4 py-2 text-sm text-stone underline-offset-4 hover:text-ink hover:underline">Sign out</button>
              </form>
            </li>
          </ul>
        </nav>
        <Link to="/" className="mt-8 hidden text-sm text-stone hover:text-ink lg:block">← Back to the store</Link>
      </aside>
      <div className="min-w-0 lg:col-span-9">
        <Outlet />
      </div>
    </section>
  );
}
