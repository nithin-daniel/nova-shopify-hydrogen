import { useState } from "react";

const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|await|async|return|if|throw|new|type|function|query|mutation|fragment|on)\b|(<\/?[A-Z][A-Za-z.]*)/g;

/** Tiny dependency-free highlighter: comments, strings, keywords, JSX tags. */
function highlight(code: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push(code.slice(last, m.index));
    const cls = m[1] ? "text-[#8b877d] italic" : m[2] ? "text-[#c8d6a3]" : m[3] ? "text-[#e8a07c]" : "text-[#9cc3e6]";
    out.push(<span key={i++} className={cls}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, label = "TypeScript" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center justify-between rounded-t-[4px] bg-[#262624] px-4 py-2 text-[0.6875rem] tracking-wide text-[#a9a59b]">
        <span>{label}</span>
        <button
          type="button"
          className="hover:text-paper"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block rounded-t-none"><code>{highlight(code)}</code></pre>
    </div>
  );
}
