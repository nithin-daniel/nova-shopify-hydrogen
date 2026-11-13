import { SECTIONS, STATUS_META } from "~/lib/lab/features";
import { Link } from "~/lib/storefront/locale";

export default function LabIndex() {
  return (
    <div>
      <p className="eyebrow mb-4">Feature playground</p>
      <h1 className="display max-w-3xl text-display">Every Hydrogen feature, <span className="serif-accent">running.</span></h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-graphite">
        This lab explores <code className="code-inline">@shopify/hydrogen@2026.10.3</code>, the framework-agnostic library release, wired into React Router 8. Each section explains a feature, runs it live, shows the code and the exact API, and labels honestly whether it is real Hydrogen behaviour, real Hydrogen over the mock API, something that needs a real store, or a custom storefront feature.
      </p>
      <div className="mt-14 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-[0.75rem] text-stone">
            <tr><th className="py-2 font-normal">Section</th><th className="py-2 font-normal">Feature</th><th className="py-2 font-normal">Hydrogen API</th><th className="py-2 font-normal">Status</th></tr>
          </thead>
          <tbody>
            {SECTIONS.flatMap((s) =>
              s.features.map((f, i) => (
                <tr key={f.id} className="border-t border-line align-top">
                  <td className="py-3 pr-4">{i === 0 ? <Link to={`/lab/${s.slug}`} className="font-medium hover:underline"><span className="mr-2 font-mono text-stone">{s.letter}</span>{s.title}</Link> : null}</td>
                  <td className="py-3 pr-4"><Link to={`/lab/${s.slug}#${f.id}`} className="hover:underline">{f.title}</Link></td>
                  <td className="py-3 pr-4 font-mono text-[0.75rem] text-graphite">{f.api.slice(0, 3).join(", ")}{f.api.length > 3 ? "…" : ""}</td>
                  <td className="py-3"><span className="flex flex-wrap gap-1">{f.status.map((st) => <span key={st} className={`status ${STATUS_META[st].className}`}>{STATUS_META[st].label}</span>)}</span></td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
