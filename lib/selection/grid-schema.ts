import { z } from "zod";

// Grille factuelle remplie par Haiku. Uniquement des champs fermés (listes de valeurs, booléens) :
// jamais de « cette publication est-elle intéressante ? ». C'est le code qui décide (final-score.ts).
export const eventTypes = [
  "resultats",
  "acquisition_cession",
  "offre_publique",
  "augmentation_capital",
  "changement_dirigeant",
  "procedure_collective",
  "depreciation",
  "rachat_actions",
  "contrat_partenariat",
  "autre",
] as const;

export const gridSchema = z.object({
  type_evenement: z.enum(eventTypes),
  revision_objectifs: z.enum(["hausse", "baisse", "aucune"]),
  montant_annonce: z.boolean(),
  impact_capital: z.boolean(),
  impact_direction: z.boolean(),
  citation: z.string(), // phrase recopiée mot pour mot, vérifiée par le code (lib/verification/quote.ts)
});

export type Grid = z.infer<typeof gridSchema>;
export type EventType = (typeof eventTypes)[number];
