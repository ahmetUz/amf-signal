import { Badge } from "@/components/ui/badge";
import type { BriefRow } from "@/lib/briefs/queries";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";
import { formatDateTime } from "@/lib/format";
import { FigureBadge } from "./figure-badge";

export function BriefCard({ brief }: { brief: BriefRow }) {
  const status = STATUS_DISPLAY[brief.status];
  return (
    <article className="space-y-4 rounded-xl border bg-card p-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{brief.company}</span>
          <span>·</span>
          <time>{formatDateTime(brief.publishedAt)}</time>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
        <h2 className="text-lg font-semibold leading-snug">{brief.title}</h2>
      </header>

      <p className="leading-relaxed">{brief.body}</p>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {brief.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>

      {brief.figures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Chiffres (survolez pour voir les contrôles)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {brief.figures.map((f) => <FigureBadge key={`${f.valeur}-${f.unite}-${f.citation_exacte}`} figure={f} />)}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <a href={brief.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
          Document source (PDF) ↗
        </a>
        <span>
          {brief.wordCount} mots · {brief.model} · {brief.attempts === 2 ? "1 relance" : "sans relance"}
        </span>
      </footer>
    </article>
  );
}
