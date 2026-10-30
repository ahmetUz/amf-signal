import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { getDocument } from "@/lib/documents/store";
import { quoteFoundIn } from "@/lib/verification/quote";
import { computeFinalScore } from "./final-score";
import { fillGrid } from "./grid";
import { scoreByRules, type RuleScore } from "./rules";

const CANDIDATE_COUNT = 10; // passent à la grille Haiku
const SELECTED_COUNT = 5; // recevront une brève

// Départage des ex aequo par des critères objectifs, sans jugement : CAC 40 d'abord, puis la plus récente.
// cac40 vient du flux brut ("1", "0" ou null). coalesce est indispensable : Postgres place les null
// en tête d'un tri DESC, et 98 publications sur 187 ont cac40 à null.
const isCac40 = sql<boolean>`coalesce((${publications.raw}->>'cac40') = '1', false)`;

/** Étape 3a : calcule le score par règles de toutes les publications et le stocke. */
async function scoreAll(): Promise<number> {
  const rows = await db
    .select({ uin: publications.uin, title: publications.title, subtype: publications.infoSubtype })
    .from(publications);

  // Une requête UPDATE par résultat distinct (une vingtaine), plutôt qu'une par publication (~190).
  const groups = new Map<string, { result: RuleScore; uins: string[] }>();
  for (const row of rows) {
    const result = scoreByRules(row);
    const key = JSON.stringify(result);
    const group = groups.get(key) ?? { result, uins: [] };
    group.uins.push(row.uin);
    groups.set(key, group);
  }

  await db.transaction(async (tx) => {
    for (const { result, uins } of groups.values()) {
      await tx
        .update(publications)
        .set({ score: result.score, scoreReasons: result.reasons, updatedAt: sql`now()` })
        .where(inArray(publications.uin, uins));
    }
  });
  return rows.length;
}

/** Les meilleures publications selon les règles : elles passent à la grille factuelle. */
async function topCandidates() {
  return db
    .select({
      uin: publications.uin,
      company: publications.company,
      title: publications.title,
      subtype: publications.infoSubtype,
      documentUrl: publications.documentUrl,
      cac40: isCac40,
    })
    .from(publications)
    .orderBy(desc(publications.score), desc(isCac40), desc(publications.publishedAt))
    .limit(CANDIDATE_COUNT);
}

type Candidate = Awaited<ReturnType<typeof topCandidates>>[number];
type Analysis = { uin: string; finalScore: number | null; finalReasons: string[] };

/** Étape 3b pour une candidate : document → grille Haiku → score final calculé par le code. */
async function analyze(candidate: Candidate): Promise<Analysis> {
  const { uin } = candidate;
  const document = await getDocument(uin, candidate.documentUrl);
  if (document.status !== "ok" || !document.text) {
    return { uin, finalScore: null, finalReasons: [`Document non analysable : ${document.status}`] };
  }
  try {
    const grid = await fillGrid({ ...candidate, text: document.text });
    const citationVerified = quoteFoundIn(grid.citation, document.text);
    const { score, reasons } = computeFinalScore({ grid, cac40: candidate.cac40, citationVerified });
    await db.update(publications).set({ grid }).where(eq(publications.uin, uin));
    return { uin, finalScore: score, finalReasons: reasons };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { uin, finalScore: null, finalReasons: [`Analyse impossible : ${message}`] };
  }
}

export async function runSelection() {
  const scored = await scoreAll();
  const candidates = await topCandidates();

  // Une candidate à la fois (garde-fou du CLAUDE.md : un seul document en mémoire).
  const analyses: Analysis[] = [];
  for (const candidate of candidates) analyses.push(await analyze(candidate));

  // Tri stable : à score final égal, l'ordre des règles (score, CAC 40, date) est conservé.
  const selected = analyses
    .filter((a) => a.finalScore !== null)
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
    .slice(0, SELECTED_COUNT)
    .map((a) => a.uin);

  await db.transaction(async (tx) => {
    await tx.update(publications).set({ selected: false, finalScore: null, finalReasons: null });
    for (const a of analyses) {
      await tx
        .update(publications)
        .set({ finalScore: a.finalScore, finalReasons: a.finalReasons, selected: selected.includes(a.uin) })
        .where(eq(publications.uin, a.uin));
    }
  });

  return { scored, analyzed: analyses.length, selected, analyses };
}
