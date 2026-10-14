import { dbMode, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = dbMode();
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, mode });
  } catch {
    // Détail volontairement absent de la réponse publique : voir les logs du serveur.
    return Response.json({ ok: false, mode }, { status: 503 });
  }
}
