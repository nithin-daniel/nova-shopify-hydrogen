import { useFetcher } from "react-router";
import { Link, useLocalizedPath } from "~/lib/storefront/locale";
import { useNavCollections, Wordmark } from "./site-header";

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const fetcher = useFetcher<{ ok: boolean; message: string }>();
  const localize = useLocalizedPath();
  const done = fetcher.data?.ok;
  return (
    <fetcher.Form method="post" action={localize("/newsletter")} className="w-full max-w-md">
      <label htmlFor={`newsletter-${tone}`} className="sr-only">Email address</label>
      <div className={`flex items-end gap-3 border-b ${tone === "dark" ? "border-paper/30 focus-within:border-paper" : "border-ink/30 focus-within:border-ink"}`}>
        <input
          id={`newsletter-${tone}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          disabled={done}
          className={`min-h-12 flex-1 bg-transparent text-base outline-none ${tone === "dark" ? "placeholder:text-paper/40" : "placeholder:text-stone"}`}
        />
        <button type="submit" disabled={fetcher.state !== "idle" || done} className="pb-3 text-sm font-medium">
          {fetcher.state !== "idle" ? "Joining…" : done ? "Subscribed" : "Subscribe →"}
        </button>
      </div>
      <p className={`mt-3 min-h-5 text-[0.8125rem] ${tone === "dark" ? "text-paper" : "text-stone"}`} role="status">
        {fetcher.data?.message ?? "Monthly notes on new releases, materials and sound. No spam."}
      </p>
    </fetcher.Form>
  );
}

export function SiteFooter() {
  const collections = useNavCollections();
  const year = 2026;
  return (
    <footer className="mt-section bg-ink text-paper">
      <div className="container-nova grid gap-14 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="display text-display-sm leading-none">
            Objects for <span className="serif-accent">focus.</span>
          </p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </div>
        <nav aria-label="Shop" className="md:col-span-2 md:col-start-7">
          <h2 className="eyebrow mb-4 text-paper/50">Shop</h2>
          <ul className="space-y-2.5 text-sm text-paper/80">
            {collections.map((c) => (
              <li key={c.id}><Link to={`/collections/${c.handle}`} className="hover:text-paper">{c.title}</Link></li>
            ))}
            <li><Link to="/collections" className="hover:text-paper">All collections</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help" className="md:col-span-2">
          <h2 className="eyebrow mb-4 text-paper/50">Help</h2>
          <ul className="space-y-2.5 text-sm text-paper/80">
            <li><Link to="/pages/contact" className="hover:text-paper">Contact</Link></li>
            <li><Link to="/pages/faq" className="hover:text-paper">FAQ</Link></li>
            <li><Link to="/policies/shipping-policy" className="hover:text-paper">Shipping</Link></li>
            <li><Link to="/policies/refund-policy" className="hover:text-paper">Returns</Link></li>
            <li><Link to="/account" className="hover:text-paper">Account</Link></li>
            {/* Real /cart link: the full-page fallback for the cart drawer. */}
            <li><a href="/cart" className="hover:text-paper">Cart</a></li>
          </ul>
        </nav>
        <nav aria-label="NOVA" className="md:col-span-2">
          <h2 className="eyebrow mb-4 text-paper/50">NOVA</h2>
          <ul className="space-y-2.5 text-sm text-paper/80">
            <li><Link to="/pages/about" className="hover:text-paper">About</Link></li>
            <li><Link to="/pages/sustainability" className="hover:text-paper">Materials</Link></li>
            <li><Link to="/blogs/journal" className="hover:text-paper">Journal</Link></li>
            <li><Link to="/bundle" className="hover:text-paper">Bundle builder</Link></li>
            <li><Link to="/compare" className="hover:text-paper">Compare</Link></li>
            <li><Link to="/lab" className="hover:text-paper">Hydrogen lab</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-nova flex flex-col gap-4 py-6 text-[0.75rem] text-paper/50 md:flex-row md:items-center md:justify-between">
          <Wordmark className="text-paper/80 !text-base" />
          <p>© {year} NOVA. A fictional brand built to explore Shopify Hydrogen 2026.10.</p>
          <ul className="flex gap-5">
            <li><Link to="/policies/privacy-policy" className="hover:text-paper">Privacy</Link></li>
            <li><Link to="/policies/terms-of-service" className="hover:text-paper">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
