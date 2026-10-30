import type { BriefRow } from "@/lib/briefs/queries";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";
import { formatDateTime } from "@/lib/format";
import { FigureBadge } from "./figure-badge";

export function BriefCard({ brief }: { brief: BriefRow }) {
  const status = STATUS_DISPLAY[brief.status];
  return (
    <article id={brief.uin} className="scroll-mt-6 space-y-4 py-8 motion-safe:animate-rise target:bg-mark-soft/40">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[.07em] text-[#3e5566]">
            <span className="size-2 rounded-full bg-mark ring-1 ring-foreground" />
            Brève <span className="opacity-45">·</span> {brief.company}
          </div>
          <time className="text-[13px] text-muted-foreground tabular-nums">{formatDateTime(brief.publishedAt)}</time>
        </div>
        <h2 className="max-w-[42ch] text-[26px] font-bold leading-[1.22] tracking-[-.02em]">{brief.title}</h2>
      </header>

      <p className="max-w-[68ch] text-[17px] leading-relaxed text-ink-2">{brief.body}</p>

      <ul className="max-w-[68ch] list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
        {brief.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>

      {brief.figures.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[.07em] text-muted-foreground">
            Chiffres contrôlés
            <span className={`rounded px-1.5 py-0.5 normal-case tracking-normal ${status.className}`}>{status.label}</span>
            <span className="font-normal normal-case tracking-normal">· survolez un chiffre pour voir les contrôles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {brief.figures.map((f) => <FigureBadge key={`${f.valeur}-${f.unite}-${f.citation_exacte}`} figure={f} />)}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <a href={brief.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-foreground underline decoration-[1.5px] underline-offset-4">
          Document source (PDF) ↗
        </a>
        <span>{brief.wordCount} mots</span>
        <span>{brief.model}</span>
        <span>{brief.attempts === 2 ? "1 relance" : "sans relance"}</span>
      </footer>
    </article>
  );
}
