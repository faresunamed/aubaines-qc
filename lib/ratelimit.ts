import "server-only";
import { headers } from "next/headers";
import { query } from "./db";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnu";
}

/** Limiteur par fenêtre fixe, stocké en base. Renvoie true si l'action est permise. */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const bucket = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const rows = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start) VALUES ($1, to_timestamp($2))
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, bucket],
  );
  // ménage occasionnel
  if (Math.random() < 0.02) await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
  return rows[0].count <= max;
}
