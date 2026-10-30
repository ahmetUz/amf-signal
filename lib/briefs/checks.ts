import type { FigureStatus } from "@/lib/verification/verify";

/** C'est le code qui compte les mots, pas le LLM (qui compte mal). Un mot = une suite sans espace. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

const SEVERITY: FigureStatus[] = ["verifie", "a_confirmer", "non_verifiable"];

/** Statut global d'une brève : celui de son chiffre le moins sûr. */
export function overallStatus(statuses: FigureStatus[]): FigureStatus {
  // Sans chiffre, rien n'a été vérifié : on ne peut pas afficher « vérifié ».
  if (statuses.length === 0) return "a_confirmer";
  return statuses.reduce((worst, s) => (SEVERITY.indexOf(s) > SEVERITY.indexOf(worst) ? s : worst));
}
