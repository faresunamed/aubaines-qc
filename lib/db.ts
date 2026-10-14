import { Pool } from "pg";
import { configuredDbUrl, pgConfig } from "./pg-config";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool(pgConfig());

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T = any>(text: string, params: unknown[] = []) {
  if (process.env.NODE_ENV === "production" && !configuredDbUrl()) {
    // Message explicite dans les logs plutôt qu'un obscur ECONNREFUSED vers localhost.
    throw new Error(
      "Aucune adresse de base de données : définissez DATABASE_URL (ou POSTGRES_URL) dans les variables d'environnement, puis redéployez.",
    );
  }
  const res = await pool.query(text, params);
  return res.rows as T[];
}
