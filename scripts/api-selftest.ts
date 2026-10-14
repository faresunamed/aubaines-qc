// Vérifie le mode API de lib/db.ts contre le simulateur (lancé par e2e-api.sh).
import { closeDb, dbMode, query } from "../lib/db";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${ok || !detail ? "" : ` → ${detail}`}`);
};

if (process.env.EXPECT_BAD_KEY) {
  try {
    await query("SELECT 1 AS x");
    check("clé invalide refusée", false, "aucune erreur");
  } catch (e) {
    const m = (e as Error).message;
    check("clé invalide → erreur claire avec conseil", /Invalid API key/.test(m) && /SUPABASE_SECRET_KEY/.test(m), m);
  }
} else {
  check("mode API actif", dbMode() === "api", dbMode());
  const d = new Date("2026-10-13T20:48:26.250Z");
  const [r] = await query<any>(
    "SELECT $1::int[] AS arr, $2::timestamptz AS ts, $3::text AS nul, $4::numeric AS num, $5::boolean AS b, $6::text AS txt",
    [[1, 2, 3], d, null, "3.99", true, `guillemet ' et antislash \\ et $2`],
  );
  check("tableau de nombres → int[]", JSON.stringify(r.arr) === "[1,2,3]", JSON.stringify(r.arr));
  check("Date → timestamptz (ms conservées)", new Date(r.ts).getTime() === d.getTime(), String(r.ts));
  check("null → NULL", r.nul === null);
  check("numeric reçu comme nombre", Number(r.num) === 3.99);
  check("booléen", r.b === true);
  check("texte avec guillemet, antislash et $2 intact", r.txt === `guillemet ' et antislash \\ et $2`, r.txt);

  const arrText = await query<any>("SELECT unnest($1::text[]) AS t ORDER BY 1", [['a"b', "c,d", "e\\f"]]);
  check("tableau de textes avec guillemets/virgules/antislash", JSON.stringify(arrText.map((x) => x.t)) === JSON.stringify(['a"b', "c,d", "e\\f"]), JSON.stringify(arrText));

  const none = await query("UPDATE users SET name = name WHERE email = $1", ["inexistant@example.com"]);
  check("UPDATE sans RETURNING → tableau vide", Array.isArray(none) && none.length === 0);
  const ord = await query<any>("SELECT slug FROM categories ORDER BY sort DESC LIMIT $1", [3]);
  check("ORDER BY / LIMIT respectés", ord.length === 3 && ord[0].slug === "autre", JSON.stringify(ord));
  try {
    await query("DROP TABLE users");
    check("DDL refusé", false);
  } catch (e) {
    check("DDL refusé par la fonction SQL", /non autorisée/.test((e as Error).message), (e as Error).message);
  }
}
await closeDb();
process.exit(failed ? 1 : 0);
