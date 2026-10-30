import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { briefs, publications } from "@/lib/db/schema";

export async function listBriefs() {
  return db
    .select({
      uin: briefs.publicationUin,
      title: briefs.title,
      body: briefs.body,
      keyFacts: briefs.keyFacts,
      figures: briefs.figures,
      status: briefs.status,
      wordCount: briefs.wordCount,
      attempts: briefs.attempts,
      model: briefs.model,
      sourceUrl: briefs.sourceUrl,
      company: publications.company,
      publishedAt: publications.publishedAt,
    })
    .from(briefs)
    .innerJoin(publications, eq(briefs.publicationUin, publications.uin))
    .orderBy(desc(publications.publishedAt));
}

export type BriefRow = Awaited<ReturnType<typeof listBriefs>>[number];
