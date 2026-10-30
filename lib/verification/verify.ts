import { containsFigure, parseFigure, type Figure } from "./numbers";
import { quoteFoundIn } from "./quote";

export type FigureStatus = "verifie" | "a_confirmer" | "non_verifiable";

/** Un chiffre de brève : valeur, unité et la citation exacte du document qui le contient. */
export type BriefFigure = Figure & { citation_exacte: string };

export type FigureCheck = {
  status: FigureStatus;
  citationInSource: boolean; // (a)
  figureInCitation: boolean; // (b)
  figureInBody: boolean; // (c)
};

/**
 * Les trois contrôles du CLAUDE.md pour un chiffre de brève :
 *   (a) la citation existe mot pour mot dans le document (après normalisation des espaces) ;
 *   (b) le chiffre apparaît dans la citation ;
 *   (c) le chiffre apparaît dans le corps de la brève.
 * verifie = (a)(b)(c) ; a_confirmer = chiffre présent dans le document mais contrôle incomplet ;
 * non_verifiable = chiffre introuvable dans le document.
 */
export function verifyFigure(figure: BriefFigure, { source, body }: { source: string; body: string }): FigureCheck {
  const parsed = parseFigure(figure);
  if (!parsed) {
    return { status: "non_verifiable", citationInSource: false, figureInCitation: false, figureInBody: false };
  }

  const citationInSource = quoteFoundIn(figure.citation_exacte, source);
  const figureInCitation = containsFigure(figure.citation_exacte, parsed);
  const figureInBody = containsFigure(body, parsed);
  const checks = { citationInSource, figureInCitation, figureInBody };

  if (citationInSource && figureInCitation && figureInBody) return { status: "verifie", ...checks };
  if (containsFigure(source, parsed)) return { status: "a_confirmer", ...checks };
  return { status: "non_verifiable", ...checks };
}
