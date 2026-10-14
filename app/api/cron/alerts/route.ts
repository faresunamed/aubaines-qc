import { timingSafeEqual } from "node:crypto";
import { runAlerts } from "@/lib/run-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sans secret configuré, la route est fermée
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Compatible avec Vercel Cron (envoie « Authorization: Bearer $CRON_SECRET ») ou tout planificateur.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Non autorisé", { status: 401 });
  return Response.json(await runAlerts());
}
