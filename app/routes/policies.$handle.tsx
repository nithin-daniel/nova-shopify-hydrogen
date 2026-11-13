import type { Route } from "./+types/policies.$handle";
import { POLICY_QUERY } from "~/lib/queries/content.server";
import { shopifyContext } from "~/lib/shopify/context";
import { Link } from "~/lib/storefront/locale";

const KEYS = { "privacy-policy": "privacyPolicy", "refund-policy": "refundPolicy", "shipping-policy": "shippingPolicy", "terms-of-service": "termsOfService" } as const;

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = KEYS[params.handle as keyof typeof KEYS];
  if (!key) throw new Response("Policy not found", { status: 404 });
  const { storefront } = context.get(shopifyContext);
  const { data, errors } = await storefront.graphql(POLICY_QUERY);
  if (errors) throw new Response("Policy query failed", { status: 500 });
  const policy = data?.shop[key];
  if (!policy) throw new Response("Policy not found", { status: 404 });
  return { policy, all: Object.entries(KEYS).map(([handle, k]) => ({ handle, title: data!.shop[k]?.title })).filter((p) => p.title) };
}

export const meta: Route.MetaFunction = ({ loaderData: d }) => (d ? [{ title: `${d.policy.title} | NOVA` }] : []);

export default function Policy({ loaderData }: Route.ComponentProps) {
  const { policy, all } = loaderData;
  return (
    <article className="container-nova grid gap-12 pt-12 lg:grid-cols-12">
      <nav aria-label="Policies" className="lg:col-span-3">
        <p className="eyebrow mb-4">Policies</p>
        <ul className="space-y-2 text-sm">
          {all.map((p) => (
            <li key={p.handle}>
              <Link to={`/policies/${p.handle}`} aria-current={p.handle === policy.handle ? "page" : undefined} className={p.handle === policy.handle ? "font-medium text-ink" : "text-graphite hover:text-ink"}>{p.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="lg:col-span-8 lg:col-start-5">
        <h1 className="display mb-10 text-display-sm">{policy.title}</h1>
        <div className="prose-nova" dangerouslySetInnerHTML={{ __html: policy.body }} />
      </div>
    </article>
  );
}
