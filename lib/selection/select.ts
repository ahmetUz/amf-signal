import { desc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { scoreByRules, type RuleScore } from "./rules";

const CANDIDATE_COUNT = 10;

// Départage des ex aequo par des critères objectifs, sans jugement : CAC 40 d'abord, puis la plus récente.
// cac40 vient du flux brut ("1", "0" ou null). coalesce est indispensable : Postgres place les null
// en tête d'un tri DESC, et 98 publications sur 187 ont cac40 à null.
const isCac40 = sql<boolean>`coalesce((${publications.raw}->>'cac40') = '1', false)`;

/** Calcule le score par règles de toutes les publications et le stocke. */
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

/** Les meilleures publications selon les règles : elles passeront à la grille factuelle (étape 3b). */
async function topCandidates() {
  return db
    .select({
      uin: publications.uin,
      company: publications.company,
      title: publications.title,
      score: publications.score,
      reasons: publications.scoreReasons,
      cac40: isCac40,
    })
    .from(publications)
    .orderBy(desc(publications.score), desc(isCac40), desc(publications.publishedAt))
    .limit(CANDIDATE_COUNT);
}

export async function runSelection() {
  const scored = await scoreAll();
  const candidates = await topCandidates();
  return { scored, candidates };
}
