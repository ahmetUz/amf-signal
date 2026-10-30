import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { extractDocument, type ExtractedDocument } from "./extract";

/**
 * Renvoie le texte d'un document, en le téléchargeant au premier appel seulement.
 * La grille de sélection puis la brève lisent le même texte sans retélécharger le PDF.
 */
export async function getDocument(publicationUin: string, url: string): Promise<ExtractedDocument> {
  const [cached] = await db.select().from(documents).where(eq(documents.publicationUin, publicationUin));
  if (cached) return cached;

  const extracted = await extractDocument(url);
  await db
    .insert(documents)
    .values({ publicationUin, ...extracted })
    .onConflictDoUpdate({ target: documents.publicationUin, set: { ...extracted, updatedAt: new Date() } });
  return extracted;
}
