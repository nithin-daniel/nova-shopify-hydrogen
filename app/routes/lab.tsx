import { NavLink, Outlet } from "react-router";
import type { Route } from "./+types/lab";
import { SECTIONS, STATUS_META, type Status } from "~/lib/lab/features";
import { getPublicRuntime } from "~/lib/shopify/env.server";
import { useLocalizedPath } from "~/lib/storefront/locale";

export function loader() {
  return { runtime: getPublicRuntime() };
}

export const meta: Route.MetaFunction = () => [{ title: "Hydrogen Lab | NOVA" }, { name: "robots", content: "noindex" }];

export default function LabLayout({ loaderData }: Route.ComponentProps) {
  const localize = useLocalizedPath();
  const r = loaderData.runtime;
  return (
    <div className="container-nova grid grid-cols-[minmax(0,1fr)] gap-10 pt-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <NavLink to={localize("/lab")} end className="mb-6 block">
          <p className="eyebrow">Hydrogen 2026.10</p>
          <p className="display text-3xl">The <span className="serif-accent">Lab</span></p>
        </NavLink>
        <div className="mb-6 rounded-sm border border-line p-3 text-[0.75rem] leading-relaxed">
          <p className="flex items-center gap-2 font-medium"><span className={`size-2 rounded-full ${r.demoMode ? "bg-amber" : "bg-moss"}`} />{r.demoMode ? "DEMO_MODE=true" : "DEMO_MODE=false"}</p>
          <p className="text-stone">{r.demoMode ? "Mock Storefront + Customer Account APIs" : `Store: ${r.storeDomain}${r.hasStorefrontToken ? "" : " (tokenless)"}`}</p>
        </div>
        <nav aria-label="Lab sections">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
            {SECTIONS.map((s) => (
              <li key={s.slug}>
                <NavLink to={localize(`/lab/${s.slug}`)} className={({ isActive }) => `flex items-center gap-3 rounded-sm px-2.5 py-1.5 text-sm whitespace-nowrap ${isActive ? "bg-ink text-paper" : "text-graphite hover:bg-bone hover:text-ink"}`}>
                  <span className="w-4 font-mono text-[0.75rem] opacity-60">{s.letter}</span>
                  {s.title}
                </NavLink>
              </li>
            ))}
          </ol>
        </nav>
        <dl className="mt-8 hidden space-y-2 text-[0.75rem] lg:block">
          {(Object.keys(STATUS_META) as Status[]).map((k) => (
            <div key={k}>
              <dt><span className={`status ${STATUS_META[k].className}`}>{STATUS_META[k].label}</span></dt>
              <dd className="mt-1 text-stone">{STATUS_META[k].description}</dd>
            </div>
          ))}
        </dl>
      </aside>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
