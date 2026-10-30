import { structuredCall } from "@/lib/llm/structured";
import { gridSchema, type Grid } from "./grid-schema";

export const GRID_MODEL = "claude-haiku-5-5";

// Prompt de la grille, recopié dans docs/NOTES.md (section Prompts).
export const GRID_SYSTEM_PROMPT = `Tu analyses une publication réglementée déposée auprès de l'AMF.
Remplis la grille UNIQUEMENT à partir du texte fourni entre les balises <document>. N'utilise aucune connaissance extérieure.

- type_evenement : l'événement principal annoncé par la publication.
- revision_objectifs : "hausse" ou "baisse" seulement si le texte dit explicitement que les objectifs ou perspectives sont relevés ou abaissés, sinon "aucune".
- montant_annonce : true si le texte mentionne un montant en euros (ou autre devise) lié à l'événement.
- impact_capital : true si le nombre d'actions ou la répartition du capital change (émission, augmentation de capital, offre, fusion).
- impact_direction : true si un dirigeant ou mandataire social arrive, part ou change de fonction.
- citation : recopie MOT POUR MOT une phrase du document qui justifie type_evenement. Ne la reformule pas, ne la résume pas.

Si une information est absente du texte, réponds false ou "aucune". Ne devine jamais.`;

export type GridInput = {
  company: string;
  title: string;
  subtype: string | null;
  text: string;
};

/** Demande la grille factuelle à Haiku en structured output (voir lib/llm/structured.ts). */
export async function fillGrid({ company, title, subtype, text }: GridInput): Promise<Grid> {
  return structuredCall(gridSchema, {
    model: GRID_MODEL,
    effort: "low", // extraction de faits simples : pas besoin de raisonnement long
    system: GRID_SYSTEM_PROMPT,
    user: `Société : ${company}\nType AMF : ${subtype ?? "non renseigné"}\nTitre : ${title}\n\n<document>\n${text}\n</document>`,
  });
}
