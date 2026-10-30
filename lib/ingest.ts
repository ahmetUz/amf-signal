import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { fetchRecentRecords } from "@/lib/amf/client";
import { toPublication, type NewPublication } from "@/lib/amf/mapper";

export type IngestReport = {
  days: number;
  fetched: number;
  upserted: number;
  rejected: { uin: string; error: string }[];
};

// Colonnes rafraîchies quand la publication existe déjà. score et selected n'en font pas partie :
// relancer la collecte ne doit pas effacer le travail de la sélection.
const REFRESHED_COLUMNS = [
  "isin", "company", "country", "info_type", "info_subtype",
  "title", "language", "published_at", "document_url", "raw",
] as const;

const refreshSet = Object.fromEntries(
  REFRESHED_COLUMNS.map((col) => [col, sql.raw(`excluded.${col}`)]),
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

  return { days, fetched: raws.length, upserted: valid.length, rejected };
}
