// Simulateur LOCAL du contrat de l'API Supabase utilisé par le site :
//   POST /rest/v1/rpc/app_query   (en-tête apikey + JSON {p_sql, p_params, p_returns_rows})
// Il relaie vers la fonction SQL réelle `app_query` de la base locale. Il sert à tester le code
// du mode API sans projet Supabase. Ce n'est PAS PostgREST : il ne valide ni le routage de la
// passerelle Supabase ni le format des nouvelles clés (sb_secret_…).
//
// Usage : npm run mock:supabase   (port 54321 ; MOCK_KEY = clé attendue, défaut cle-locale-de-test-pas-un-secret)
import http from "node:http";
import { Pool } from "pg";
import { pgConfig } from "../lib/pg-config";

const PORT = Number(process.env.MOCK_PORT ?? 54321);
const KEY = process.env.MOCK_KEY ?? "cle-locale-de-test-pas-un-secret";
const pool = new Pool(pgConfig());
let calls = 0;
let badKey = 0;
const authSeen = new Set<string>();

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (req.method === "GET" && url.pathname === "/__stats") return json(res, 200, { calls, badKey, authSeen: [...authSeen] });

    if (req.method !== "POST" || url.pathname !== "/rest/v1/rpc/app_query") return json(res, 404, { message: "Not Found" });

    const apikey = req.headers["apikey"];
    const auth = String(req.headers["authorization"] ?? "");
    authSeen.add(auth.startsWith("Bearer ") ? "Bearer <clé>" : auth ? "autre" : "absent");
    if (apikey !== KEY && auth !== `Bearer ${KEY}`) {
      badKey++;
      return json(res, 401, { message: "Invalid API key", hint: "Double check your Supabase `anon` or `service_role` API key." });
    }

    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body: any;
    try { body = JSON.parse(raw); } catch { return json(res, 400, { message: "Invalid JSON" }); }
    if (typeof body.p_sql !== "string") return json(res, 404, { code: "PGRST202", message: "Could not find the function public.app_query in the schema cache" });

    calls++;
    try {
      const r = await pool.query("SELECT public.app_query($1::text, $2::jsonb, $3::boolean) AS r", [
        body.p_sql, JSON.stringify(body.p_params ?? []), body.p_returns_rows ?? true,
      ]);
      json(res, 200, r.rows[0].r);
    } catch (e: any) {
      // même forme d'erreur que PostgREST
      json(res, 400, { code: e.code ?? "P0001", message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
    }
  })
  .listen(PORT, () => console.log(`Simulateur API Supabase prêt sur http://localhost:${PORT}`));
