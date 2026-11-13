import type { Route } from "./+types/blogs.$blogHandle";
import { ShopImage } from "~/components/ui";
import { BLOG_QUERY } from "~/lib/queries/content.server";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(BLOG_QUERY, { variables: { handle: params.blogHandle, first: 24 } });
  if (errors) throw new Response("Blog query failed", { status: 500 });
  if (!data?.blog) throw new Response("Blog not found", { status: 404 });
  return { blog: data.blog };
}

export const meta: Route.MetaFunction = ({ loaderData: d }) => (d ? [{ title: `${d.blog.title} | NOVA` }, { name: "description", content: d.blog.seo?.description ?? "" }] : []);

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function Blog({ loaderData }: Route.ComponentProps) {
  const { blog } = loaderData;
  const [lead, ...rest] = blog.articles.nodes;
  return (
    <section className="container-nova pt-12">
      <p className="eyebrow mb-4">The NOVA {blog.title}</p>
      <h1 className="display mb-4 text-display">Notes on <span className="serif-accent">working well.</span></h1>
      <p className="mb-14 max-w-xl text-lg text-graphite">{blog.seo?.description}</p>
      {lead ? (
        <Link to={`/blogs/${blog.handle}/${lead.handle}`} className="group mb-20 grid gap-8 md:grid-cols-12 md:items-center">
          <div className="overflow-hidden bg-bone md:col-span-7"><ShopImage image={lead.image} aspect={16 / 10} loading="eager" widths={[640, 768]} sizes="(min-width: 768px) 55vw, 100vw" className="transition-transform duration-[1400ms] group-hover:scale-105" /></div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[0.8125rem] text-stone">{date(lead.publishedAt)} · {lead.author?.name}</p>
            <h2 className="display mt-3 text-4xl">{lead.title}</h2>
            <p className="mt-4 leading-relaxed text-graphite">{lead.excerpt}</p>
            <span className="mt-6 inline-block text-sm underline underline-offset-4">Read the story</span>
          </div>
        </Link>
      ) : null}
      <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((a) => (
          <Link key={a.id} to={`/blogs/${blog.handle}/${a.handle}`} className="group">
            <div className="overflow-hidden bg-bone"><ShopImage image={a.image} aspect={4 / 3} widths={[480, 768]} sizes="(min-width: 1024px) 30vw, 50vw" className="transition-transform duration-[1200ms] group-hover:scale-105" /></div>
            <p className="mt-4 text-[0.75rem] text-stone">{date(a.publishedAt)} · {a.tags.join(", ")}</p>
            <h2 className="mt-1 text-xl leading-snug font-medium tracking-tight">{a.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-graphite">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
