import type { BriefRow } from "@/lib/briefs/queries";
import { categoryOf } from "@/lib/publications/category";
import { formatDateTime } from "@/lib/format";
import { FigureCheck } from "./figure-check";

export function BriefCard({ brief, index }: { brief: BriefRow; index: number }) {
  const category = categoryOf({ title: brief.publicationTitle, subtype: brief.infoSubtype });
  return (
    <article
      id={brief.uin}
      className="-mx-4 scroll-mt-6 space-y-5 rounded-xl px-4 py-8 transition-colors duration-500 target:bg-mark-soft/50 motion-safe:animate-rise"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[.07em]" style={{ color: category.color }}>
            <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
            {category.label}
            <span className="opacity-45">·</span>
            <span className="text-[#3e5566]">{brief.company}</span>
          </div>
          <time className="text-[13px] text-muted-foreground tabular-nums">{formatDateTime(brief.publishedAt)}</time>
        </div>
        <h2 className="max-w-[40ch] text-[28px] font-bold leading-[1.2] tracking-[-.02em]">{brief.title}</h2>
      </header>

      <p className="max-w-[68ch] text-[17px] leading-relaxed text-ink-2">{brief.body}</p>

      <ul className="max-w-[68ch] space-y-1.5 text-[15px] text-ink-2">
        {brief.keyFacts.map((fact) => (
          <li key={fact} className="flex gap-2.5">
            <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-mark ring-1 ring-foreground/40" />
            {fact}
          </li>
        ))}
      </ul>

      {brief.figures.length > 0 && (
        <section className="max-w-[68ch] space-y-2">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.07em] text-slate-2">
            Chiffres contrôlés · cliquez pour voir les contrôles
          </h3>
          <div className="space-y-1.5">
            {brief.figures.map((f) => <FigureCheck key={`${f.valeur}-${f.unite}-${f.citation_exacte}`} figure={f} />)}
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <a
          href={brief.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-1 rounded-full border border-foreground px-3 py-1 font-semibold text-foreground transition-colors duration-150 hover:bg-foreground hover:text-white"
        >
          Document source (PDF)
          <span className="transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-0.5">↗</span>
        </a>
        <span>{brief.wordCount} mots</span>
        <span>{brief.model}</span>
        <span>{brief.attempts === 2 ? "1 relance" : "sans relance"}</span>
        {brief.finalScore !== null && (
          <span title={brief.finalReasons?.join("\n")}>Score de sélection {brief.finalScore}</span>
        )}
      </footer>
    </article>
  );
}
