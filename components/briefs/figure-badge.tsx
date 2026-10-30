import { Badge } from "@/components/ui/badge";
import type { CheckedFigure } from "@/lib/db/schema";
import { STATUS_DISPLAY } from "@/lib/briefs/labels";

// Les trois contrôles, dans l'ordre du CLAUDE.md : affichés au survol pour comprendre un statut.
function checksSummary(f: CheckedFigure): string {
  const mark = (ok: boolean) => (ok ? "✓" : "✗");
  return [
    `${mark(f.citationInSource)} citation présente mot pour mot dans le document`,
    `${mark(f.figureInCitation)} chiffre présent dans la citation`,
    `${mark(f.figureInBody)} chiffre présent dans la brève`,
    `Citation : « ${f.citation_exacte} »`,
  ].join("\n");
}

export function FigureBadge({ figure }: { figure: CheckedFigure }) {
  const display = STATUS_DISPLAY[figure.status];
  return (
    <Badge className={display.className} title={checksSummary(figure)}>
      {figure.valeur} {figure.unite}
    </Badge>
  );
}
