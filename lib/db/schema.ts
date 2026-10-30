import { boolean, jsonb, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

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
  score: integer("score"),
  scoreReasons: jsonb("score_reasons").$type<string[]>(),
  selected: boolean("selected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS(); // RLS sans policy : l'API REST de Supabase est bloquée, et le rôle postgres (propriétaire) passe toujours.
