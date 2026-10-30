import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit ne lit pas .env.local : on réutilise le chargeur de Next (aucune dépendance en plus).
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Session pooler : les migrations ont besoin d'une session stable, ce que le transaction pooler ne garantit pas.
  dbCredentials: { url: process.env.DATABASE_URL_MIGRATE! },
});
