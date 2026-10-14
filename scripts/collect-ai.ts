// Agent d'extraction IA (quotidien).
//   npm run collect:ai                       → sources de ai-sources.config.json (ou env AI_SOURCES_JSON)
//   npm run collect:ai -- --dry              → n'écrit rien, affiche ce qui serait extrait
//   npm run collect:ai -- --html page.html --name "Nom" --slug nom   → teste sur une page enregistrée (dry)
// Les offres extraites arrivent en statut « à réviser » : un admin les publie dans /admin.
import fs from "node:fs";
import { closeDb } from "../lib/db";
import { ensureCategories, ingest } from "../lib/ingest";
import { anthropicCaller, chunkText, htmlToText, validateItems } from "../lib/extract";
import { aiExtractCollector, type AiSourceConfig } from "../collectors/ai-extract";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const dry = flag("dry") || flag("html");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("ANTHROPIC_API_KEY manquant."); process.exit(1); }
const model = anthropicCaller({ apiKey, model: process.env.AI_MODEL, baseUrl: process.env.ANTHROPIC_BASE_URL });
const today = new Date().toISOString().slice(0, 10);

if (flag("html")) {
  const text = htmlToText(fs.readFileSync(opt("html")!, "utf8"));
  const name = opt("name") ?? "Commerce", slug = opt("slug") ?? "commerce";
  for (const chunk of chunkText(text)) {
    const v = validateItems(await model(chunk, { establishment: name, today }), chunk, "https://exemple.ca", slug, today);
    console.log(JSON.stringify(v, null, 2));
  }
  process.exit(0);
}

// Un secret GitHub absent arrive comme chaîne vide : on le traite comme « non défini ».
const raw = process.env.AI_SOURCES_JSON?.trim() || (fs.existsSync("ai-sources.config.json") ? fs.readFileSync("ai-sources.config.json", "utf8") : "");
if (!raw) { console.log("Aucune source. Créez ai-sources.config.json (voir ai-sources.config.example.json)."); process.exit(0); }
const all: AiSourceConfig[] = JSON.parse(raw);
const sources = all.filter((s) => s.authorized === true);
console.log(`${sources.length} source(s) autorisée(s) sur ${all.length} (les autres sont ignorées).`);
if (!sources.length) process.exit(0);

if (!dry) await ensureCategories();
let failures = 0;
for (const s of sources) {
  const c = aiExtractCollector(s, model, (l) =>
    console.log(`  · ${l.url} → ${l.status}, ${l.found} offre(s), ${l.rejected.length} rejetée(s)`));
  try {
    if (dry) {
      const items = await c.fetch();
      console.log(`✔ ${s.establishment.name} (essai) : ${items.length}`, items.slice(0, 5));
    } else {
      console.log(`✔ ${s.establishment.name}: ${await ingest(c)} offres à réviser`);
    }
  } catch (e) {
    failures++;
    console.error(`✘ ${s.establishment.name}:`, (e as Error).message);
  }
}
if (!dry) await closeDb();
process.exit(failures ? 1 : 0);
