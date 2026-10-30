import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { briefs, publications, type CheckedFigure } from "@/lib/db/schema";
import { getDocument } from "@/lib/documents/store";
import { verifyFigure } from "@/lib/verification/verify";
import { countWords, overallStatus } from "./checks";
import { BRIEF_MODEL, writeBrief, type BriefInput, type BriefOutput } from "./write";

const MIN_WORDS = 100;
const MAX_WORDS = 150;

type Evaluation = { figures: CheckedFigure[]; wordCount: number; issues: string[] };

/** Contrôle une brève par le code : chiffres vérifiés dans le document, mots comptés. */
function evaluate(brief: BriefOutput, source: string): Evaluation {
  const figures = brief.chiffres.map((figure) => ({ ...figure, ...verifyFigure(figure, { source, body: brief.corps }) }));
  const wordCount = countWords(brief.corps);

  const issues = figures
    .filter((f) => f.status === "non_verifiable")
    .map((f) => `Le chiffre « ${f.valeur} ${f.unite} » est introuvable dans le document : retire-le ou remplace-le par un chiffre du document, avec sa citation exacte.`);
  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) {
    issues.push(`Le corps fait ${wordCount} mots ; il doit en faire entre ${MIN_WORDS} et ${MAX_WORDS}.`);
  }
  return { figures, wordCount, issues };
}

export class BriefError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Génère, vérifie et stocke la brève d'une publication. Une seule relance au maximum,
 * avec les erreurs en contexte, puis le résultat est stocké tel quel (pas de boucle infinie).
 */
export async function generateBrief(uin: string, { force = false } = {}) {
  const [publication] = await db.select().from(publications).where(eq(publications.uin, uin));
  if (!publication) throw new BriefError("Publication inconnue", 404);

  // Comme pour la grille : une brève existante n'est pas régénérée (coût, reproductibilité).
  if (!force) {
    const [existing] = await db.select().from(briefs).where(eq(briefs.publicationUin, uin));
    if (existing) return { brief: existing, reused: true };
  }

  const document = await getDocument(uin, publication.documentUrl);
  if (document.status !== "ok" || !document.text) {
    throw new BriefError(`Document non exploitable : ${document.status}`, 422);
  }

  const input: BriefInput = { ...publication, text: document.text };
  let output = await writeBrief(input);
  let evaluation = evaluate(output, document.text);
  let attempts = 1;
  // On garde les problèmes de la 1re tentative : ce sont les erreurs de l'IA détectées par le code.
  const firstAttemptIssues = evaluation.issues.length > 0 ? evaluation.issues : null;
  if (firstAttemptIssues) {
    output = await writeBrief(input, { previous: output, issues: evaluation.issues });
    evaluation = evaluate(output, document.text);
    attempts = 2;
  }

  const values = {
    title: output.titre,
    body: output.corps,
    keyFacts: output.faits_cles,
    figures: evaluation.figures,
    status: overallStatus(evaluation.figures.map((f) => f.status)),
    wordCount: evaluation.wordCount,
    attempts,
    firstAttemptIssues,
    model: BRIEF_MODEL,
    sourceUrl: publication.documentUrl,
  };
  const [brief] = await db
    .insert(briefs)
    .values({ publicationUin: uin, ...values })
    .onConflictDoUpdate({ target: briefs.publicationUin, set: { ...values, updatedAt: new Date() } })
    .returning();
  return { brief, reused: false, remainingIssues: evaluation.issues };
}
