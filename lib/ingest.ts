import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { fetchRecentRecords } from "@/lib/amf/client";
import { toPublication, type NewPublication } from "@/lib/amf/mapper";
import { findDuplicates } from "@/lib/publications/duplicates";

export type IngestReport = {
  days: number;
  fetched: number;
  upserted: number;
  duplicates: number;
  rejected: { uin: string; error: string }[];
};

// Colonnes rafraîchies quand la publication existe déjà. score et selected n'en font pas partie :
// relancer la collecte ne doit pas effacer le travail de la sélection.
// Les clés de set sont les noms TypeScript (publishedAt), pas les noms SQL (published_at) : Drizzle ignore
// en silence une clé inconnue. C'était le cas au début, et l'heure corrigée n'était jamais réécrite.
const REFRESHED_COLUMNS = [
  "isin", "company", "country", "infoType", "infoSubtype",
  "title", "language", "publishedAt", "documentUrl", "raw",
] as const;

const refreshSet = Object.fromEntries(
  REFRESHED_COLUMNS.map((key) => [key, sql.raw(`excluded.${publications[key].name}`)]),
);

export async function ingest(days: number): Promise<IngestReport> {
  const raws = await fetchRecentRecords(days);
  const valid: NewPublication[] = [];
  const rejected: IngestReport["rejected"] = [];
  for (const raw of raws) {
    const result = toPublication(raw);
    if (result.ok) valid.push(result.publication);
    else rejected.push({ uin: result.uin, error: result.error });
  }

  if (valid.length > 0) {
    // Upsert sur uin : la route est idempotente, deux appels donnent le même nombre de lignes.
    await db
      .insert(publications)
      .values(valid)
      .onConflictDoUpdate({
        target: publications.uin,
        set: { ...refreshSet, updatedAt: sql`now()` },
      });
  }

  const duplicates = await markDuplicates();
  return { days, fetched: raws.length, upserted: valid.length, duplicates, rejected };
}

/** Recalcule les doublons sur toute la table : un doublon peut arriver un jour après l'original. */
async function markDuplicates(): Promise<number> {
  const rows = await db
    .select({ uin: publications.uin, company: publications.company, title: publications.title, publishedAt: publications.publishedAt })
    .from(publications);
  const duplicates = findDuplicates(rows);

  await db.transaction(async (tx) => {
    await tx.update(publications).set({ duplicateOf: null });
    for (const [uin, original] of duplicates) {
      await tx.update(publications).set({ duplicateOf: original }).where(eq(publications.uin, uin));
    }
  });
  return duplicates.size;
}
