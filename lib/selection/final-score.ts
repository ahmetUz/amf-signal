import type { EventType, Grid } from "./grid-schema";

/**
 * Score final : le code transforme la grille factuelle remplie par Haiku en points.
 * Fonction pure, testée dans final-score.test.ts. Les points sont un choix éditorial assumé et affiché.
 */

export type FinalScoreInput = {
  grid: Grid;
  cac40: boolean;
  citationVerified: boolean;
};

export type FinalScore = { score: number; reasons: string[] };

const EVENT_POINTS: Record<EventType, { label: string; points: number }> = {
  offre_publique: { label: "Offre publique", points: 5 },
  acquisition_cession: { label: "Acquisition ou cession", points: 5 },
  procedure_collective: { label: "Procédure collective", points: 5 },
  changement_dirigeant: { label: "Changement de dirigeant", points: 5 },
  augmentation_capital: { label: "Augmentation de capital", points: 5 },
  depreciation: { label: "Dépréciation", points: 4 },
  resultats: { label: "Résultats", points: 3 },
  rachat_actions: { label: "Rachat d'actions", points: 2 },
  contrat_partenariat: { label: "Contrat ou partenariat", points: 2 },
  autre: { label: "Autre événement", points: 1 },
};

// Une révision des objectifs (avertissement sur résultats ou relèvement) pèse autant qu'une opération.
const RESULTS_WITH_REVISION = 5;

function eventScore({ type_evenement, revision_objectifs }: Grid): { label: string; points: number } {
  if (type_evenement === "resultats" && revision_objectifs !== "aucune") {
    return { label: `Résultats avec objectifs revus à la ${revision_objectifs}`, points: RESULTS_WITH_REVISION };
  }
  return EVENT_POINTS[type_evenement];
}

export function computeFinalScore({ grid, cac40, citationVerified }: FinalScoreInput): FinalScore {
  const event = eventScore(grid);
  const bonuses: [boolean, string][] = [
    [grid.montant_annonce, "Montant annoncé"],
    [grid.impact_capital, "Impact sur le capital"],
    [grid.impact_direction, "Impact sur la direction"],
    [cac40, "Société du CAC 40"],
  ];
  const earned = bonuses.filter(([applies]) => applies).map(([, label]) => label);

  const reasons = [`${event.label} (+${event.points})`, ...earned.map((label) => `${label} (+1)`)];
  // On signale sans pénaliser : une citation mal recopiée ne rend pas forcément la grille fausse,
  // mais un humain doit la relire.
  if (!citationVerified) reasons.push("⚠ Citation introuvable dans le document : grille à vérifier");

  return { score: event.points + earned.length, reasons };
}
