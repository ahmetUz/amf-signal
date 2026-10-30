import type { CheckedFigure } from "@/lib/db/schema";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";

const CHECKS: { key: "citationInSource" | "figureInCitation" | "figureInBody"; label: string }[] = [
  { key: "citationInSource", label: "Citation présente mot pour mot dans le document" },
  { key: "figureInCitation", label: "Chiffre présent dans la citation" },
  { key: "figureInBody", label: "Chiffre présent dans la brève" },
];

// <details> natif : se déplie au clic, accessible au clavier, sans JavaScript client.
// Remplace l'infobulle au survol, invisible sur mobile et peu découvrable.
export function FigureCheck({ figure }: { figure: CheckedFigure }) {
  const status = STATUS_DISPLAY[figure.status];
  return (
    <details className="group/fig rounded-md border transition-colors duration-150 open:border-rule-strong hover:border-rule-strong">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{figure.valeur} {figure.unite}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">« {figure.citation_exacte} »</span>
        <span className="shrink-0 text-base leading-none text-muted-foreground transition-transform duration-200 group-open/fig:rotate-90">›</span>
      </summary>
      <div className="space-y-2 border-t px-3 py-2.5 text-[13px] motion-safe:animate-rise">
        <ul className="space-y-0.5">
          {CHECKS.map(({ key, label }) => (
            <li key={key} className={figure[key] ? "text-ok" : "text-danger"}>
              {figure[key] ? "✓" : "✗"} <span className="text-ink-2">{label}</span>
            </li>
          ))}
        </ul>
        <blockquote className="border-l-2 border-mark pl-3 text-muted-foreground">« {figure.citation_exacte} »</blockquote>
      </div>
    </details>
  );
}
