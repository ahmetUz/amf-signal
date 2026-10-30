import type { BriefRow } from "@/lib/briefs/queries";
import { categoryOf } from "@/lib/publications/category";
import { formatDateTime } from "@/lib/format";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";
import { figureStatuses } from "@/lib/db/schema";
import { FigureCheck } from "./figure-check";

// Liste des chiffres repliée par défaut : elle peut dépasser 15 lignes. Le résumé donne les compteurs par statut,
// et l'accordéon s'ouvre d'emblée si un chiffre n'est pas vérifié, pour ne pas cacher un problème.
function FiguresAccordion({ brief }: { brief: BriefRow }) {
  return (
    <details open={brief.status !== "verifie"} className="group/acc max-w-[68ch] rounded-lg border">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 transition-colors duration-150 hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[.07em] text-slate-2">
          {brief.figures.length} chiffres contrôlés
        </span>
        {figureStatuses.map((status) => {
          const count = brief.figures.filter((f) => f.status === status).length;
          if (count === 0) return null;
          return (
            <span key={status} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_DISPLAY[status].className}`}>
              {count} {STATUS_DISPLAY[status].label.toLowerCase()}
            </span>
          );
        })}
        <span className="ml-auto text-lg leading-none text-muted-foreground transition-transform duration-200 group-open/acc:rotate-90">›</span>
      </summary>
      <div className="space-y-1.5 border-t p-3 motion-safe:animate-rise">
        <p className="px-1 pb-1 text-xs text-muted-foreground">Cliquez sur un chiffre pour voir les trois contrôles.</p>
        {brief.figures.map((f) => <FigureCheck key={`${f.valeur}-${f.unite}-${f.citation_exacte}`} figure={f} />)}
      </div>
    </details>
  );
}

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

      {brief.figures.length > 0 && <FiguresAccordion brief={brief} />}

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
