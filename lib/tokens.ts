import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { query } from "./db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export type TokenKind = "verify" | "reset";

/** Crée un jeton à usage unique. Seul son hash est stocké. */
export async function createToken(userId: number, kind: TokenKind, ttlMinutes: number) {
  const raw = randomBytes(32).toString("hex");
  await query(
    // un seul jeton actif par type : on invalide les précédents
    "UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL",
    [userId, kind],
  );
  await query(
    `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
     VALUES ($1,$2,$3, now() + ($4 || ' minutes')::interval)`,
    [userId, kind, hash(raw), String(ttlMinutes)],
  );
  return raw;
}

/** Consomme un jeton valide (atomique). Renvoie l'id utilisateur ou null. */
export async function consumeToken(raw: string, kind: TokenKind): Promise<number | null> {
  if (!/^[0-9a-f]{64}$/.test(raw)) return null;
  const rows = await query<{ user_id: number }>(
    `UPDATE auth_tokens SET used_at = now()
     WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hash(raw), kind],
  );
  return rows[0]?.user_id ?? null;
}

/** Vérifie un jeton sans le consommer (pour afficher la page). */
export async function peekToken(raw: string, kind: TokenKind): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(raw)) return false;
  const rows = await query(
    `SELECT 1 FROM auth_tokens
     WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()`,
    [hash(raw), kind],
  );
  return rows.length > 0;
}
