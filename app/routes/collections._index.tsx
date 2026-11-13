import type { Route } from "./+types/collections._index";
import { ShopImage } from "~/components/ui";
import { COLLECTIONS_INDEX_QUERY } from "~/lib/queries/catalog.server";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

export async function loader({ context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(COLLECTIONS_INDEX_QUERY);
  if (errors) throw new Response("Collections query failed", { status: 500 });
  return { collections: data!.collections.nodes };
}

export const meta: Route.MetaFunction = () => [{ title: "All collections | NOVA" }, { name: "description", content: "Sound, studio, desk, light, power and mobile: every NOVA collection." }];

export default function Collections({ loaderData }: Route.ComponentProps) {
  return (
    <section className="container-nova pt-12">
      <p className="eyebrow mb-4">Collections</p>
      <h1 className="display mb-14 text-display">Everything <span className="serif-accent">we make.</span></h1>
      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {loaderData.collections.map((c) => (
          <Link key={c.id} to={`/collections/${c.handle}`} className="group">
            <div className="overflow-hidden bg-bone">
              <ShopImage image={c.image} aspect={4 / 3} widths={[480, 768]} sizes="(min-width: 1024px) 33vw, 50vw" className="transition-transform duration-[1200ms] group-hover:scale-105" />
            </div>
            <p className="mt-4 text-micro uppercase tracking-[0.18em] text-stone">{c.kicker?.value}</p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight">{c.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-graphite">{c.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
