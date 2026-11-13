import type { Route } from "./+types/blogs.$blogHandle.$articleHandle";
import { ProductCard } from "~/components/product/product-card";
import { ShopImage } from "~/components/ui";
import { ARTICLE_QUERY } from "~/lib/queries/content.server";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(ARTICLE_QUERY, { variables: { blogHandle: params.blogHandle, articleHandle: params.articleHandle } });
  if (errors) throw new Response("Article query failed", { status: 500 });
  const article = data?.blog?.articleByHandle;
  if (!data?.blog || !article) throw new Response("Article not found", { status: 404 });
  let relatedHandles: string[];
  try {
    relatedHandles = article.related ? (JSON.parse(article.related.value) as string[]) : [];
  } catch {
    relatedHandles = [];
  }
  const products = relatedHandles.map((h) => data.products.nodes.find((p) => p.handle === h)).filter((p) => p != null);
  return { blog: { handle: data.blog.handle, title: data.blog.title }, article, products, canonical: new URL(request.url).origin + new URL(request.url).pathname };
}

export const meta: Route.MetaFunction = ({ loaderData: d }) =>
  d
    ? [
        { title: `${d.article.title} | NOVA Journal` },
        { name: "description", content: d.article.seo?.description ?? d.article.excerpt ?? "" },
        { tagName: "link", rel: "canonical", href: d.canonical },
        { property: "og:type", content: "article" },
        ...(d.article.image ? [{ property: "og:image", content: d.article.image.url }] : []),
        { "script:ld+json": { "@context": "https://schema.org", "@type": "Article", headline: d.article.title, datePublished: d.article.publishedAt, author: { "@type": "Person", name: d.article.author?.name }, image: d.article.image?.url } },
      ]
    : [];

export default function Article({ loaderData }: Route.ComponentProps) {
  const { blog, article, products } = loaderData;
  return (
    <article className="pt-10">
      <header className="container-nova mx-auto max-w-4xl text-center">
        <Link to={`/blogs/${blog.handle}`} className="eyebrow hover:text-ink">{blog.title} · {article.tags.join(", ")}</Link>
        <h1 className="display mt-6 text-display-sm md:text-display">{article.title}</h1>
        <p className="mt-6 text-sm text-stone">By {article.author?.name} · {new Date(article.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </header>
      {article.image ? (
        <div className="container-nova mt-12 max-w-5xl"><div className="overflow-hidden bg-bone"><ShopImage image={article.image} aspect={16 / 9} loading="eager" widths={[768]} sizes="(min-width: 1024px) 64rem, 100vw" crop="center" /></div></div>
      ) : null}
      <div className="container-nova mt-14 flex justify-center">
        <div className="prose-nova" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
      </div>
      {products.length ? (
        <section className="container-nova mt-section">
          <p className="eyebrow mb-3">Featured in this story</p>
          <h2 className="display mb-10 text-3xl">Shop the <span className="serif-accent">article.</span></h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      ) : null}
    </article>
  );
}
