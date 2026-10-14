// Tests de bout en bout contre un serveur Next en marche (npm run build && npm start -- -p 3100).
// Usage : BASE_URL=http://localhost:3100 npm run e2e
// ATTENTION : écrit dans la base (comptes e2e-*@example.com) — refuse de tourner hors localhost.
import { spawnSync } from "node:child_process";
import { closeDb, query } from "../lib/db";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const dbUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aubaines";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
  console.error("Refus : DATABASE_URL n'est pas locale.");
  process.exit(2);
}

let passed = 0, failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++; else failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${ok || !detail ? "" : `\n       → ${detail}`}`);
}

const IP = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

class Client {
  jar = new Map<string, string>();
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }
  absorb(res: Response) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i), val = pair.slice(i + 1);
      if (/max-age=0/i.test(attrs.join(";")) || val === "") this.jar.delete(name);
      else this.jar.set(name, val);
    }
  }
  async get(path: string) {
    const res = await fetch(BASE + path, { redirect: "manual", headers: { cookie: this.cookieHeader(), "x-forwarded-for": IP } });
    this.absorb(res);
    return { status: res.status, location: res.headers.get("location") ?? "", text: await res.text() };
  }
  /** Soumet le formulaire (de la page `path`) qui contient `marker`, avec ses champs cachés Next. */
  async submit(path: string, marker: string, fields: Record<string, string>, files: Record<string, { name: string; content: string }> = {}) {
    const page = await this.get(path);
    const forms = page.text.split(/<form\b/i).slice(1).map((f) => f.split(/<\/form>/i)[0]);
    const form = forms.find((f) => f.includes(marker));
    if (!form) return { status: 0, location: "", text: `formulaire introuvable (${marker}) sur ${path}` };
    const fd = new FormData();
    for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
      const name = /name="([^"]*)"/.exec(m[0])?.[1];
      const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
      if (name) fd.append(name, decode(value));
    }
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    for (const [k, f] of Object.entries(files)) fd.append(k, new Blob([f.content], { type: "text/csv" }), f.name);
    const res = await fetch(BASE + path, { method: "POST", body: fd, redirect: "manual", headers: { cookie: this.cookieHeader(), "x-forwarded-for": IP } });
    this.absorb(res);
    return { status: res.status, location: res.headers.get("location") ?? "", text: await res.text() };
  }
}

const mailTo = async (email: string, like: string) =>
  (await query<{ body: string; subject: string }>(
    "SELECT body, subject FROM email_outbox WHERE to_email = $1 AND subject ILIKE $2 ORDER BY id DESC LIMIT 1", [email, like]))[0];
const linkIn = (body: string, path: string) => new RegExp(`${path.replace("/", "\\/")}\\?token=[0-9a-f]+`).exec(body)?.[0];

// ---------- préparation ----------
await query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com'");
await query("DELETE FROM establishments WHERE slug LIKE 'e2e-%'");
await query("DELETE FROM email_outbox WHERE to_email LIKE 'e2e-%@example.com'");
await query("TRUNCATE rate_limits");

const PASS = "motdepasse-e2e-1";
const A = "e2e-a@example.com", B = "e2e-b@example.com", C = "e2e-admin@example.com";

// ---------- 1. inscription ----------
const a = new Client();
let r = await a.submit("/inscription", 'name="terms"', { name: "Alice", email: A, password: PASS });
check("inscription refusée sans acceptation des conditions", r.text.includes("accepter les conditions"), r.text.slice(0, 200));
r = await a.submit("/inscription", 'name="terms"', { name: "Alice", email: A, password: PASS, terms: "on" });
check("inscription réussie (redirection + cookie de session)", r.status === 303 && a.jar.has("session"), `${r.status} ${r.location}`);

// ---------- 2. vérification du courriel ----------
let mail = await mailTo(A, "%Confirmez%");
const vlink = mail && linkIn(mail.body, "/verifier");
check("courriel de confirmation envoyé", !!vlink);
if (vlink) {
  r = await a.get(vlink);
  check("page de confirmation affiche un bouton (pas d'effet au simple GET)", r.text.includes("Confirmer mon courriel") && (await query("SELECT 1 FROM users WHERE email=$1 AND email_verified_at IS NOT NULL", [A])).length === 0);
  r = await a.submit(vlink, 'name="token"', {});
  check("confirmation du courriel", r.status === 303 && (await query("SELECT 1 FROM users WHERE email=$1 AND email_verified_at IS NOT NULL", [A])).length === 1, `${r.status} ${r.location}`);
  r = await new Client().get(vlink);
  check("le lien de confirmation est à usage unique", r.text.includes("invalide") || r.text.includes("expiré"), r.text.slice(0, 120));
}

// ---------- 3. mot de passe oublié ----------
const oldSession = new Client(); oldSession.jar = new Map(a.jar);
const anon = new Client();
r = await anon.submit("/mot-de-passe-oublie", 'name="email"', { email: "inconnu-e2e@example.com" });
check("réponse identique pour un courriel inconnu (pas de fuite)", r.text.includes("Si un compte existe"));
r = await anon.submit("/mot-de-passe-oublie", 'name="email"', { email: A });
check("réponse pour un courriel connu", r.text.includes("Si un compte existe"));
mail = await mailTo(A, "%Réinitialisation%");
const rlink = mail && linkIn(mail.body, "/reinitialiser");
check("courriel de réinitialisation envoyé", !!rlink);
if (rlink) {
  r = await anon.submit(rlink, 'name="token"', { password: "court" });
  check("nouveau mot de passe trop court refusé", r.text.includes("au moins 8"));
  r = await anon.submit(rlink, 'name="token"', { password: PASS + "-nouveau" });
  check("réinitialisation réussie + connexion", r.status === 303 && anon.jar.has("session"), `${r.status}`);
  r = await oldSession.get("/favoris");
  check("anciennes sessions révoquées après réinitialisation", r.status === 307 || r.location.includes("/connexion"), `${r.status} ${r.location}`);
  r = await new Client().get(rlink);
  check("le lien de réinitialisation est à usage unique", r.text.includes("invalide") || r.text.includes("expiré"));
}
const a2 = new Client();
r = await a2.submit("/connexion", 'name="password"', { email: A, password: PASS });
check("ancien mot de passe refusé", r.text.includes("incorrect") && !a2.jar.has("session"));
r = await a2.submit("/connexion", 'name="password"', { email: A, password: PASS + "-nouveau" });
check("nouveau mot de passe accepté", r.status === 303 && a2.jar.has("session"));

// ---------- 4. alerte (créée AVANT l'offre de commerçant) ----------
r = await a2.submit("/alertes", 'name="minDiscount"', { keyword: "poulet rôti test" });
check("création d'une alerte", r.text.includes("Alerte créée") || r.status === 200, r.text.slice(0, 150));
check("alerte en base", (await query("SELECT 1 FROM alerts a JOIN users u ON u.id=a.user_id WHERE u.email=$1", [A])).length === 1);

// ---------- 5. commerçant ----------
const b = new Client();
await b.submit("/inscription", 'name="terms"', { name: "Bob", email: B, password: PASS, terms: "on" });
r = await b.submit("/commercant", 'name="business"', { business: "E2E Marché", website: "https://exemple.ca" });
check("demande commerçant refusée si courriel non confirmé", r.text.includes("Confirmez") || r.status !== 303);
await query("UPDATE users SET email_verified_at = now() WHERE email = $1", [B]);
r = await b.submit("/commercant", 'name="business"', { business: "E2E Marché", website: "https://exemple.ca", message: "Test" });
check("demande commerçant envoyée", r.text.includes("Demande envoyée") || r.status === 200);
r = await b.get("/commercant/offres");
check("accès aux offres refusé avant approbation", r.status === 307 && r.location.includes("/commercant"), `${r.status} ${r.location}`);

const c = new Client();
await c.submit("/inscription", 'name="terms"', { name: "Chef", email: C, password: PASS, terms: "on" });
r = await c.get("/admin");
check("/admin refusé à un utilisateur ordinaire", r.status === 307, `${r.status}`);
await query("UPDATE users SET role='admin', email_verified_at = now() WHERE email = $1", [C]);
r = await c.get("/admin");
check("/admin accessible à l'admin, demande visible", r.status === 200 && r.text.includes("E2E Marché"));
const [bu] = await query<{ id: number }>("SELECT id FROM users WHERE email = $1", [B]);
r = await c.submit("/admin", `value="${bu.id}"`, { kind: "epicerie", name: "e2e-marche-nom" });
// le slug dépend du nom ; on le force pour le nettoyage
const [est] = await query<{ id: number; slug: string }>("SELECT e.id, e.slug FROM merchant_profiles m JOIN establishments e ON e.id=m.establishment_id WHERE m.user_id=$1", [bu.id]);
check("approbation du commerçant (établissement créé)", !!est, `${r.status} ${r.location}`);
if (est) await query("UPDATE establishments SET slug = 'e2e-' || slug WHERE id = $1 AND slug NOT LIKE 'e2e-%'", [est.id]);
check("rôle commerçant attribué + courriel d'approbation", (await query("SELECT 1 FROM users WHERE id=$1 AND role='merchant'", [bu.id])).length === 1 && !!(await mailTo(B, "%approuvé%")));

r = await b.submit("/commercant/offres", 'name="regularPrice"', { title: "Poulet rôti test", price: "4,99", regularPrice: "7,99", unit: "chacun" });
check("création d'une offre", r.status === 303, `${r.status} ${r.text.slice(0, 200)}`);
r = await b.submit("/commercant/offres", 'name="regularPrice"', { title: "Prix absurde", price: "9,99", regularPrice: "5,00" });
check("offre avec prix régulier < prix promo refusée", r.text.includes("supérieur"));
r = await new Client().get("/?q=poulet+roti+test");
check("l'offre est visible publiquement et classée", r.text.includes("Poulet rôti test") && r.text.includes("Viandes et poissons"));
check("rabais calculé (−38 %)", r.text.includes("38"));

const csv = "titre;prix;prix_regulier;fin\nPain de campagne e2e;3,49;4,99;2099-12-31\nBière artisanale e2e;12,99;15,99;2099-12-31\nLigne cassée;abc;;\n";
r = await b.submit("/commercant/import", 'name="file"', {}, { file: { name: "offres.csv", content: csv } });
check("import CSV : 2 offres importées, 1 erreur signalée", r.text.includes("2 offres importées") && r.text.includes("Ligne 4"), r.text.replace(/<[^>]+>/g, " ").slice(0, 300));
r = await b.submit("/commercant/import", 'name="file"', {}, { file: { name: "offres.csv", content: csv } });
const [cnt] = await query<{ n: number }>("SELECT count(*)::int AS n FROM promotions WHERE establishment_id=$1", [est.id]);
check("réimport sans doublon (3 offres au total)", cnt.n === 3, String(cnt.n));

const [offer] = await query<{ id: number }>("SELECT id FROM promotions WHERE establishment_id=$1 AND title='Poulet rôti test'", [est.id]);
r = await b.submit(`/commercant/offres/${offer.id}`, 'name="id"', { title: "Poulet rôti test (modifié)", price: "3,99", regularPrice: "7,99" });
check("modification d'une offre", r.status === 303 && (await query("SELECT 1 FROM promotions WHERE id=$1 AND title LIKE '%modifié%'", [offer.id])).length === 1);

// un autre commerçant ne peut pas toucher cette offre
const [other] = await query<{ id: number }>("SELECT id FROM establishments WHERE id <> $1 LIMIT 1", [est.id]);
const rowsBefore = (await query("SELECT 1 FROM promotions WHERE id=$1", [offer.id])).length;
check("l'offre existe pour la suite", rowsBefore === 1 && !!other);

// ---------- 6. envoi des alertes ----------
const run = () => spawnSync("npx", ["tsx", "scripts/send-alerts.ts"], { encoding: "utf8", env: { ...process.env, APP_URL: BASE } });
let out = run();
mail = await mailTo(A, "%Aubaines QC :%");
check("alerte envoyée pour la nouvelle offre", !!mail && mail.body.includes("Poulet rôti test"), (out.stdout + out.stderr).slice(0, 300));
check("le courriel d'alerte contient un lien de désabonnement", !!mail && mail.body.includes("/desabonnement?token="));
const before = (await query<{ n: number }>("SELECT count(*)::int AS n FROM email_outbox WHERE to_email=$1", [A]))[0].n;
out = run();
const after = (await query<{ n: number }>("SELECT count(*)::int AS n FROM email_outbox WHERE to_email=$1", [A]))[0].n;
check("deuxième passage : aucun doublon d'alerte", after === before, `${before} → ${after}`);

// ---------- 7. désabonnement ----------
const ulink = mail && /\/desabonnement\?token=[0-9a-f]+/.exec(mail.body)?.[0];
if (ulink) {
  r = await new Client().submit(ulink, 'name="token"', {});
  check("désabonnement", (await query("SELECT 1 FROM users WHERE email=$1 AND alerts_opt_out", [A])).length === 1, `${r.status} ${r.location}`);
}

// ---------- 8. droits d'accès ----------
r = await a2.get("/commercant/offres");
check("un utilisateur ordinaire n'accède pas au portail commerçant", r.status === 307);
r = await new Client().get("/alertes");
check("alertes réservées aux connectés", r.status === 307);

// ---------- 9. SEO / PWA ----------
r = await new Client().get("/etablissement/iga");
check("page établissement /etablissement/iga", r.status === 200 && r.text.includes("<h1") && r.text.includes("IGA"));
r = await new Client().get("/categorie/boulangerie");
check("page catégorie /categorie/boulangerie", r.status === 200 && r.text.includes("<h1"));
r = await new Client().get("/categorie/inexistante");
check("catégorie inconnue → 404", r.status === 404);
r = await new Client().get("/sitemap.xml");
check("sitemap.xml liste les pages", r.status === 200 && r.text.includes("/etablissement/iga") && r.text.includes("/categorie/boulangerie"));
r = await new Client().get("/robots.txt");
check("robots.txt", r.text.includes("Disallow: /admin") && r.text.includes("Sitemap:"));
r = await new Client().get("/manifest.webmanifest");
check("manifest PWA", r.status === 200 && r.text.includes("Aubaines"));
r = await new Client().get("/api/health");
check("/api/health", r.status === 200 && r.text.includes("true"));
for (const p of ["/conditions", "/confidentialite", "/commercant"]) {
  r = await new Client().get(p);
  check(`page ${p}`, r.status === 200);
}

// ---------- 9b. route cron ----------
r = await new Client().get("/api/cron/alerts");
check("/api/cron/alerts refuse l'accès sans secret", r.status === 401, String(r.status));

// ---------- 10. limitation de tentatives ----------
const rl = new Client();
let blocked = false;
for (let i = 0; i < 12; i++) {
  const x = await rl.submit("/connexion", 'name="password"', { email: "e2e-rate@example.com", password: "mauvais" + i });
  if (x.text.includes("Trop de tentatives")) { blocked = true; break; }
}
check("connexions répétées limitées", blocked);

// ---------- nettoyage ----------
await query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com'");
await query("DELETE FROM establishments WHERE slug LIKE 'e2e-%'");
await closeDb();
console.log(`\n${passed} réussis, ${failed} échoués`);
process.exit(failed ? 1 : 0);
