import { Await } from "react-router";
import { Suspense } from "react";
import type { Route } from "./+types/home";
import { ProductCard, ProductRail } from "~/components/product/product-card";
import { PersonalisedPicks, RecentlyViewed } from "~/components/product/recently-viewed";
import { NewsletterForm } from "~/components/layout/site-footer";
import { Icon, parseRating, Price, RatingSummary, SectionHeading, ShopImage, Stars } from "~/components/ui";
import { HOME_QUERY } from "~/lib/queries/catalog.server";
import { getReviewsProvider } from "~/lib/reviews.server";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

export const meta: Route.MetaFunction = ({ matches }) => {
  const origin = (matches[0]?.loaderData as { origin?: string } | undefined)?.origin ?? "";
  return [
    { title: "NOVA | Objects for focus" },
    { name: "description", content: "Headphones, speakers, lighting and desk objects, machined and built to be kept. Free shipping over $150." },
    { property: "og:title", content: "NOVA | Objects for focus" },
    { property: "og:type", content: "website" },
    { tagName: "link", rel: "canonical", href: `${origin}/` },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "NOVA",
        url: origin,
        slogan: "Objects for focus.",
      },
    },
  ];
};

export async function loader({ context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(HOME_QUERY);
  if (errors) {
    console.error("[nova] home query failed", errors);
    throw new Response("Home query failed", { status: 500 });
  }
  const reviews = await getReviewsProvider();
  return {
    ...data!,
    // Deferred: streamed after the shell (not needed for first paint).
    testimonials: reviews.featured(3),
  };
}

const MOMENTS = [
  { label: "Deep work", to: "/collections/desk", icon: "sparkle" as const },
  { label: "Late listening", to: "/collections/sound", icon: "star" as const },
  { label: "Record at home", to: "/collections/studio", icon: "code" as const },
  { label: "After dark", to: "/collections/light", icon: "eye" as const },
  { label: "On the move", to: "/collections/mobile", icon: "truck" as const },
  { label: "Gifts under $100", to: "/collections/gifts-under-100", icon: "box" as const },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { hero, feature, collections, bestSellers, newest, articles, testimonials } = loaderData;
  const categories = collections.nodes.filter((c) => ["sound", "desk", "light", "studio", "power", "mobile"].includes(c.handle));
  const walnut = collections.nodes.find((c) => c.handle === "walnut-edition");

  return (
    <>
      {/* HERO ------------------------------------------------------------- */}
      <section className="container-nova grid items-end gap-10 pt-8 pb-section lg:grid-cols-12 lg:gap-6 lg:pt-14">
        <div className="lg:col-span-6 lg:pb-10">
          <p className="eyebrow mb-6 animate-fade-up">Autumn / Winter 2026 · The Quiet Collection</p>
          <h1 className="display animate-fade-up text-display-xl [animation-delay:80ms]">
            Hear less.
            <br />
            Notice <span className="serif-accent text-ember">more.</span>
          </h1>
          <p className="mt-8 max-w-md animate-fade-up text-lg leading-relaxed text-graphite [animation-delay:160ms]">
            Headphones, light and desk objects designed to quiet the noise around you, machined, tuned and built to be kept for a decade.
          </p>
          <div className="mt-10 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
            <Link to="/collections/sound" className="btn btn-primary">Shop sound</Link>
            <Link to="/collections/new-arrivals" className="btn btn-secondary">New arrivals</Link>
          </div>
        </div>
        {hero ? (
          <div className="relative lg:col-span-6">
            <div className="grid grid-cols-5 gap-3 md:gap-4">
              <div className="col-span-3 overflow-hidden bg-bone">
                <ShopImage image={hero.images.nodes[1] ?? hero.featuredImage} aspect={3 / 4} loading="eager" widths={[480, 640, 768]} sizes="(min-width: 1024px) 30vw, 60vw" alt="Listening with Halo ANC Headphones" />
              </div>
              <div className="col-span-2 flex flex-col gap-3 md:gap-4">
                <div className="overflow-hidden bg-bone">
                  <ShopImage image={hero.featuredImage} aspect={4 / 5} loading="eager" widths={[320, 480]} sizes="(min-width: 1024px) 20vw, 40vw" />
                </div>
                <Link to={`/products/${hero.handle}`} className="group flex flex-1 flex-col justify-between bg-ink p-4 text-paper md:p-5">
                  <span className="eyebrow text-paper/50">Featured</span>
                  <span>
                    <span className="block text-lg leading-tight font-medium">{hero.title}</span>
                    <span className="mt-1 flex items-center justify-between text-sm text-paper/70">
                      <Price price={hero.priceRange.minVariantPrice} from />
                      <Icon name="arrow" size={18} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* PROMISE STRIP ------------------------------------------------------ */}
      <section aria-label="Our promise" className="border-y border-line">
        <ul className="container-nova grid grid-cols-2 gap-y-4 py-6 text-[0.8125rem] text-graphite md:grid-cols-4">
          {[
            ["truck", "Free shipping over $150"],
            ["return", "30-day returns, no questions"],
            ["shield", "Two-year warranty on everything"],
            ["box", "Spare parts for seven years"],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon name={icon as "truck"} size={18} className="text-ink" /> {text}
            </li>
          ))}
        </ul>
      </section>

      {/* COLLECTIONS -------------------------------------------------------- */}
      <section className="container-nova pt-section">
        <SectionHeading eyebrow="Collections" title="Six rooms," accent="one idea." action={<Link to="/collections" className="link-underline text-sm">All collections</Link>} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-4">
          {categories.map((c, i) => {
            const span = ["md:col-span-5 md:row-span-2", "md:col-span-4", "md:col-span-3", "md:col-span-3", "md:col-span-4", "md:col-span-7"][i] ?? "md:col-span-4";
            const tall = i === 0;
            return (
              <Link key={c.id} to={`/collections/${c.handle}`} className={`group relative overflow-hidden bg-bone ${span}`}>
                <ShopImage image={c.image} aspect={tall ? 3 / 4.3 : i === 5 ? 16 / 9 : 4 / 5} widths={[400, 640, 768]} sizes="(min-width: 768px) 40vw, 50vw" className="transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0" />
                <div className="absolute inset-x-4 bottom-4 text-paper md:inset-x-5 md:bottom-5">
                  <p className="text-micro uppercase tracking-[0.18em] text-paper/70">{c.kicker?.value}</p>
                  <p className={`display ${tall ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}`}>{c.title}</p>
                </div>
              </Link>
            );
          })}
          <Link to="/collections" className="group col-span-2 flex flex-col justify-between bg-ink p-6 text-paper md:col-span-5 md:p-8">
            <p className="eyebrow text-paper/50">Not sure where to start?</p>
            <div>
              <p className="display text-3xl md:text-4xl">
                Browse every <span className="serif-accent">collection.</span>
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-paper/70">
                Sound, studio, desk, light, power and mobile <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* BEST SELLERS ------------------------------------------------------- */}
      <section className="container-nova pt-section">
        <SectionHeading eyebrow="Best sellers" title="Most" accent="loved." action={<Link to="/collections/best-sellers" className="link-underline text-sm">Shop all</Link>} />
        <ProductRail products={bestSellers.nodes} />
      </section>

      {/* EDITORIAL FEATURE -------------------------------------------------- */}
      {feature ? (
        <section className="mt-section bg-bone">
          <div className="container-nova grid gap-10 py-section md:grid-cols-12 md:items-center">
            <div className="grid grid-cols-2 gap-3 md:col-span-7 md:gap-4">
              <div className="overflow-hidden"><ShopImage image={feature.images.nodes[1] ?? feature.featuredImage} aspect={3 / 4} widths={[400, 640]} sizes="(min-width: 768px) 28vw, 50vw" /></div>
              <div className="mt-16 overflow-hidden"><ShopImage image={feature.featuredImage} aspect={3 / 4} widths={[400, 640]} sizes="(min-width: 768px) 28vw, 50vw" /></div>
            </div>
            <div className="md:col-span-4 md:col-start-9">
              <p className="eyebrow mb-5">Product story · No. 07</p>
              <h2 className="display text-display-sm">
                The keyboard that <span className="serif-accent">listens back.</span>
              </h2>
              <p className="mt-6 leading-relaxed text-graphite">
                Keyframe 75 floats on silicone gaskets inside a single block of machined aluminium, so every keystroke lands soft and sounds deep. Hot-swap switches mean it grows with you.
              </p>
              <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
                {["Gasket mount, hot-swap PCB", "Tri-mode wireless, six weeks per charge", "Three colourways, two switch families"].map((h) => (
                  <li key={h} className="flex gap-3"><Icon name="check" size={18} className="shrink-0 text-ember" />{h}</li>
                ))}
              </ul>
              <div className="mt-8 flex items-center gap-5">
                <Link to={`/products/${feature.handle}`} className="btn btn-primary">Explore Keyframe 75</Link>
                <RatingSummary rating={parseRating(feature.rating, feature.ratingCount)} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* BRAND STATEMENT ---------------------------------------------------- */}
      <section className="container-nova grid gap-12 py-section md:grid-cols-12">
        <p className="display text-display-sm md:col-span-8">
          We make fewer, better things. Each NOVA object goes through more than a hundred prototypes, and ships only when we would keep it on our own desks <span className="serif-accent">for a decade.</span>
        </p>
        <dl className="grid grid-cols-3 gap-6 self-end border-t border-line pt-6 md:col-span-4 md:col-start-9">
          {[["2 yr", "warranty, minimum"], ["7 yr", "spare-part promise"], ["70%", "recycled aluminium"]].map(([n, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="text-3xl font-medium tracking-tight">{n}</dd>
              <dd className="mt-1 text-[0.75rem] leading-snug text-stone">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* NEW ARRIVALS ------------------------------------------------------- */}
      <section className="container-nova">
        <SectionHeading eyebrow="New arrivals" title="Just" accent="landed." action={<Link to="/collections/new-arrivals" className="link-underline text-sm">See everything new</Link>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {newest.nodes.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* DISCOVERY ---------------------------------------------------------- */}
      <section className="container-nova pt-section">
        <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow mb-4">Shop by moment</p>
            <h2 className="display text-3xl">What are you making <span className="serif-accent">room</span> for?</h2>
          </div>
          <ul className="flex flex-wrap content-start gap-2.5 md:col-span-8">
            {MOMENTS.map((m) => (
              <li key={m.label}>
                <Link to={m.to} className="group inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line px-5 text-[0.9375rem] transition hover:border-ink hover:bg-ink hover:text-paper">
                  <Icon name={m.icon} size={17} /> {m.label}
                </Link>
              </li>
            ))}
            {walnut ? (
              <li>
                <Link to={`/collections/${walnut.handle}`} className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#5b3a29] px-5 text-[0.9375rem] text-paper">
                  The Walnut Edition <Icon name="arrow" size={16} />
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      {/* RECENTLY VIEWED + PERSONAL PICKS (client, localStorage) ----------- */}
      <RecentlyViewed className="container-nova pt-section" />
      <PersonalisedPicks className="container-nova pt-section" />

      {/* SOCIAL PROOF ------------------------------------------------------- */}
      <Suspense fallback={null}>
        <Await resolve={testimonials}>
          {(reviews) =>
            reviews.length ? (
              <section className="container-nova pt-section" aria-label="Customer reviews">
                <SectionHeading eyebrow="4.7 average from 18,000+ reviews" title="In their" accent="words." />
                <div className="grid gap-px bg-line md:grid-cols-3">
                  {reviews.map((r) => (
                    <figure key={r.id} className="flex flex-col justify-between gap-8 bg-paper p-6 md:p-8">
                      <blockquote>
                        <Stars value={r.rating} />
                        <p className="mt-4 font-serif text-[1.45rem] leading-snug italic">“{r.title}”</p>
                        <p className="mt-3 text-[0.9375rem] leading-relaxed text-graphite">{r.body}</p>
                      </blockquote>
                      <figcaption className="text-[0.8125rem] text-stone">
                        {r.author} · {r.location}
                        {r.verifiedBuyer ? <span className="ml-2 text-moss">Verified buyer</span> : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null
          }
        </Await>
      </Suspense>

      {/* JOURNAL ------------------------------------------------------------ */}
      {articles.nodes.length ? (
        <section className="container-nova pt-section">
          <SectionHeading eyebrow="Journal" title="Notes on" accent="working well." action={<Link to="/blogs/journal" className="link-underline text-sm">Read the journal</Link>} />
          <div className="grid gap-8 md:grid-cols-3">
            {articles.nodes.map((a) => (
              <Link key={a.id} to={`/blogs/${a.blog.handle}/${a.handle}`} className="group">
                <div className="overflow-hidden bg-bone"><ShopImage image={a.image} aspect={4 / 3} widths={[480, 768]} sizes="(min-width: 768px) 30vw, 100vw" className="transition-transform duration-[1200ms] group-hover:scale-105" /></div>
                <p className="mt-4 text-[0.75rem] text-stone">{new Date(a.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <h3 className="mt-1 text-xl leading-snug font-medium tracking-tight">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-graphite">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* NEWSLETTER --------------------------------------------------------- */}
      <section className="container-nova pt-section">
        <div className="grid gap-10 bg-ember px-6 py-14 text-paper md:grid-cols-2 md:items-end md:px-14 md:py-20">
          <h2 className="display text-display-sm">
            Quiet emails, <span className="serif-accent">once a month.</span>
          </h2>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
