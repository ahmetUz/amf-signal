import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const publications = pgTable("publications", {
  uin: text("uin").primaryKey(), // uin_idt_uin : clé d'unicité, sert à l'upsert
  isin: text("isin"),
  company: text("company").notNull(),
  country: text("country"),
  infoType: text("info_type"),
  infoSubtype: text("info_subtype"),
  title: text("title").notNull(),
  language: text("language").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  documentUrl: text("document_url").notNull(),
  raw: jsonb("raw").notNull(),
  score: integer("score"), // score par règles (étape 3a)
  scoreReasons: jsonb("score_reasons").$type<string[]>(),
  grid: jsonb("grid"), // grille factuelle remplie par Haiku (étape 3b), validée par Zod à la lecture
  finalScore: integer("final_score"), // calculé par le code à partir de la grille
  finalReasons: jsonb("final_reasons").$type<string[]>(),
  selected: boolean("selected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS(); // RLS sans policy : l'API REST de Supabase est bloquée, et le rôle postgres (propriétaire) passe toujours.

export const documentStatuses = ["ok", "trop_volumineux", "pas_un_pdf", "erreur"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

// Le PDF n'est jamais stocké : seulement son texte extrait (réutilisé par la grille puis par la brève).
export const documents = pgTable("documents", {
  publicationUin: text("publication_uin")
    .primaryKey()
    .references(() => publications.uin, { onDelete: "cascade" }),
  status: text("status", { enum: documentStatuses }).notNull(),
  text: text("text"),
  pageCount: integer("page_count"), // pages du document, pas seulement celles extraites
  sizeBytes: integer("size_bytes"),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const figureStatuses = ["verifie", "a_confirmer", "non_verifiable"] as const;

// Un chiffre de brève après vérification : ce que le LLM a fourni, plus le résultat des trois contrôles.
export type CheckedFigure = {
  valeur: string;
  unite: string;
  citation_exacte: string;
  status: (typeof figureStatuses)[number];
  citationInSource: boolean;
  figureInCitation: boolean;
  figureInBody: boolean;
};

export const briefs = pgTable("briefs", {
  publicationUin: text("publication_uin")
    .primaryKey()
    .references(() => publications.uin, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  keyFacts: jsonb("key_facts").$type<string[]>().notNull(),
  figures: jsonb("figures").$type<CheckedFigure[]>().notNull(),
  status: text("status", { enum: figureStatuses }).notNull(), // statut du chiffre le moins sûr
  wordCount: integer("word_count").notNull(), // compté par le code
  attempts: integer("attempts").notNull(), // 1, ou 2 s'il y a eu une relance
  model: text("model").notNull(),
  sourceUrl: text("source_url").notNull(), // ajouté par le code, jamais par le LLM
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
