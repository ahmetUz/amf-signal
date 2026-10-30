import { z } from "zod";
import { structuredCall } from "@/lib/llm/structured";

export const BRIEF_MODEL = "claude-haiku-5-5";

export const briefOutputSchema = z.object({
  titre: z.string(),
  corps: z.string(),
  faits_cles: z.array(z.string()),
  chiffres: z.array(
    z.object({
      valeur: z.string(), // telle qu'écrite dans le document : « 7,3 »
      unite: z.string(), // « Md€ », « % », « M€ »…
      citation_exacte: z.string(),
    }),
  ),
});

export type BriefOutput = z.infer<typeof briefOutputSchema>;

// Prompts recopiés dans docs/NOTES.md (section Prompts).
export const BRIEF_SYSTEM_PROMPT = `Tu es journaliste financier. Tu rédiges une brève à partir d'une publication réglementée déposée auprès de l'AMF.
Utilise UNIQUEMENT le texte fourni entre les balises <document>.

- titre : informatif et factuel, sans superlatif.
- corps : entre 100 et 150 mots, en français, au présent, sans formule promotionnelle.
- faits_cles : 3 à 5 faits courts.
- chiffres : CHAQUE chiffre cité dans le corps (montants, pourcentages, quantités ; jamais les dates), avec sa valeur telle qu'écrite dans le document (ex. "7,3"), son unité (ex. "Md€", "M€", "%") et citation_exacte : la phrase du document qui contient ce chiffre, recopiée mot pour mot.

Règles strictes :
- n'utilise aucun chiffre absent du document ;
- ne calcule rien : ni variation, ni conversion, ni arrondi, ni total ;
- n'ajoute aucune information extérieure au document ;
- ignore la présentation générique de la société (section « À propos », « About », effectifs, nombre de clients) : n'en tire ni fait ni chiffre ;
- ne reformule jamais une citation_exacte.`;

export const RETRY_INSTRUCTIONS = `Le contrôle automatique a détecté des problèmes dans ta brève précédente.
Réécris la brève complète en corrigeant ces problèmes, avec les mêmes règles.`;

export type BriefInput = {
  company: string;
  title: string;
  publishedAt: Date;
  text: string;
};

export type RetryContext = { previous: BriefOutput; issues: string[] };

function userMessage({ company, title, publishedAt, text }: BriefInput, retry?: RetryContext): string {
  const base = `Société : ${company}\nDate de dépôt : ${publishedAt.toISOString().slice(0, 10)}\nTitre AMF : ${title}\n\n<document>\n${text}\n</document>`;
  if (!retry) return base;
  return `${base}\n\n${RETRY_INSTRUCTIONS}\n\n<brève_précédente>\n${JSON.stringify(retry.previous, null, 2)}\n</brève_précédente>\n\nProblèmes :\n${retry.issues.map((i) => `- ${i}`).join("\n")}`;
}

/** Demande une brève à Haiku en structured output (voir lib/llm/structured.ts). */
export async function writeBrief(input: BriefInput, retry?: RetryContext): Promise<BriefOutput> {
  return structuredCall(briefOutputSchema, {
    model: BRIEF_MODEL,
    effort: "medium",
    system: BRIEF_SYSTEM_PROMPT,
    user: userMessage(input, retry),
  });
}
