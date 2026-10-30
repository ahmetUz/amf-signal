import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant (voir .env.example)");

// prepare: false, car le transaction pooler de Supabase ne gère pas les requêtes préparées.
// Le cache sur globalThis évite d'ouvrir une connexion à chaque rechargement à chaud en dev.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };
const client = globalForDb.pgClient ?? postgres(url, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
