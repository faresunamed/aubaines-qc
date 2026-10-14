// Accès à la base de données. Deux modes, choisis automatiquement :
//
//  • "api" — par l'API HTTPS de Supabase (SUPABASE_URL + clé secrète). Aucune adresse Postgres
//    n'est nécessaire : les requêtes passent par la fonction SQL `app_query` (voir db/schema.sql),
//    appelable uniquement avec la clé secrète.
//  • "pg"  — connexion Postgres directe (DATABASE_URL / POSTGRES_URL, ou la base locale de dev).
//
// Choix : DB_MODE=api|pg force un mode. Sinon, le mode « api » est utilisé dès que SUPABASE_URL
// et la clé secrète sont définies ; sinon « pg ».
import { Pool } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configuredDbUrl, pgConfig } from "./pg-config";

export type DbMode = "api" | "pg" | "none";

function apiSettings() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export function dbMode(): DbMode {
  const forced = process.env.DB_MODE;
  if (forced === "pg") return configuredDbUrl() || process.env.NODE_ENV !== "production" ? "pg" : "none";
  if (forced === "api") return apiSettings() ? "api" : "none";
  if (apiSettings()) return "api";
  if (configuredDbUrl() || process.env.NODE_ENV !== "production") return "pg";
  return "none"; // production sans aucune configuration
}

const g = globalThis as unknown as { pgPool?: Pool; sbClient?: SupabaseClient };

/** Pool Postgres (mode « pg » seulement : migrations, tests, développement). */
export function getPool(): Pool {
  if (!g.pgPool) g.pgPool = new Pool(pgConfig());
  return g.pgPool;
}

function getClient(): SupabaseClient {
  if (!g.sbClient) {
    const s = apiSettings();
    if (!s) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis pour le mode API.");
    g.sbClient = createClient(s.url, s.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      // jamais de cache : chaque requête doit refléter l'état réel de la base
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  }
  return g.sbClient;
}

/** Ferme les connexions (scripts). Sans effet en mode API. */
export async function closeDb() {
  if (g.pgPool) {
    await g.pgPool.end();
    g.pgPool = undefined;
  }
}

// ---- mode API ----

const pgArray = (a: unknown[]) =>
  "{" +
  a
    .map((v) =>
      v == null ? "NULL" : typeof v === "number" || typeof v === "boolean" ? String(v) : `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    )
    .join(",") +
  "}";

/** Valeur JSON envoyée à la fonction SQL ; les tableaux deviennent des littéraux Postgres « {1,2} ». */
function toParam(v: unknown): unknown {
  if (v === undefined) return null;
  if (Array.isArray(v)) return pgArray(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  return v;
}

const RETURNS_ROWS = /^\s*(select|with)\b|\breturning\b/i;

async function apiQuery<T>(text: string, params: unknown[]): Promise<T[]> {
  const { data, error } = await getClient().rpc("app_query", {
    p_sql: text,
    p_params: params.map(toParam),
    p_returns_rows: RETURNS_ROWS.test(text),
  });
  if (error) {
    const msg = error.message ?? "erreur inconnue";
    let hint = "";
    if (/Could not find the function|PGRST202/i.test(`${error.code} ${msg}`))
      hint = " — exécutez db/schema.sql dans le SQL Editor de Supabase (il crée la fonction app_query).";
    else if (/invalid api key|jwt|apikey/i.test(msg))
      hint = " — vérifiez SUPABASE_SECRET_KEY (clé secrète valide, non révoquée).";
    else if (/permission denied/i.test(msg))
      hint = " — la clé utilisée n'est pas la clé SECRÈTE (service_role).";
    throw new Error(`API base de données : ${msg}${hint}`);
  }
  return (data ?? []) as T[];
}

// ---- point d'entrée unique ----

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const mode = dbMode();
  if (mode === "none") {
    // Message explicite dans les logs plutôt qu'un obscur ECONNREFUSED vers localhost.
    throw new Error(
      "Aucune base de données configurée : définissez SUPABASE_URL et SUPABASE_SECRET_KEY (API Supabase), ou DATABASE_URL (Postgres direct), puis redéployez.",
    );
  }
  if (mode === "api") return apiQuery<T>(text, params);
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
