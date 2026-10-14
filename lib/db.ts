import { Pool } from "pg";
import { pgConfig } from "./pg-config";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool(pgConfig());

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T = any>(text: string, params: unknown[] = []) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
