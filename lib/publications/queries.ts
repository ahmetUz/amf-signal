import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import type { PublicationFilters } from "./filters";

// Les jours sont calculés à l'heure de Paris : une publication déposée à 23h30 UTC appartient au jour suivant.
const parisDay = sql<string>`to_char(${publications.publishedAt} at time zone 'Europe/Paris', 'YYYY-MM-DD')`;

const MAX_ROWS = 500;

function whereClause({ q, subtype, day }: PublicationFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];
  if (q) conditions.push(or(ilike(publications.company, `%${q}%`), ilike(publications.isin, `%${q}%`)));
  if (subtype) conditions.push(eq(publications.infoSubtype, subtype));
  if (day) conditions.push(eq(parisDay, day));
  return and(...conditions);
}

export async function listPublications(filters: PublicationFilters) {
  return db
    .select({
      uin: publications.uin,
      company: publications.company,
      isin: publications.isin,
      country: publications.country,
      infoSubtype: publications.infoSubtype,
      title: publications.title,
      publishedAt: publications.publishedAt,
      documentUrl: publications.documentUrl,
      score: publications.score,
      scoreReasons: publications.scoreReasons,
      finalScore: publications.finalScore,
      finalReasons: publications.finalReasons,
      selected: publications.selected,
    })
    .from(publications)
    .where(whereClause(filters))
    .orderBy(desc(publications.selected), sql`${publications.finalScore} desc nulls last`, desc(publications.publishedAt))
    .limit(MAX_ROWS);
}

export type PublicationRow = Awaited<ReturnType<typeof listPublications>>[number];

/** Valeurs proposées dans les filtres, tirées des données réellement stockées. */
export async function listFilterOptions() {
  const [subtypes, days] = await Promise.all([
    db
      .select({ value: publications.infoSubtype, count: sql<number>`count(*)::int` })
      .from(publications)
      .groupBy(publications.infoSubtype)
      .orderBy(desc(sql`count(*)`)),
    db
      .selectDistinct({ value: parisDay })
      .from(publications)
      .orderBy(desc(parisDay)),
  ]);
  return {
    subtypes: subtypes.filter((s): s is { value: string; count: number } => s.value !== null),
    days: days.map((d) => d.value),
  };
}
