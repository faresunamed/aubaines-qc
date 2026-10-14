// Usage :
//   npm run collect            → sources réelles de collectors.config.json
//   npm run collect -- --demo  → données fictives de démonstration
import fs from "node:fs";
import { pool } from "../lib/db";
import { ensureCategories, ingest } from "../lib/ingest";
import { demoCollectors } from "../collectors/demo";
import { jsonFeedCollector, type JsonFeedConfig } from "../collectors/json-feed";
import type { Collector } from "../collectors/types";

const useDemo = process.argv.includes("--demo");
const collectors: Collector[] = [];

if (useDemo) collectors.push(...demoCollectors());

if (fs.existsSync("collectors.config.json")) {
  const cfgs: JsonFeedConfig[] = JSON.parse(fs.readFileSync("collectors.config.json", "utf8"));
  collectors.push(...cfgs.map(jsonFeedCollector));
}

if (collectors.length === 0) {
  console.log("Aucune source. Ajoutez collectors.config.json (voir l'exemple) ou lancez avec --demo.");
  process.exit(0);
}

await ensureCategories();
let failures = 0;
for (const c of collectors) {
  try {
    const n = await ingest(c);
    console.log(`✔ ${c.establishment.name}: ${n} promotions`);
  } catch (e) {
    failures++;
    console.error(`✘ ${c.establishment.name}:`, (e as Error).message);
  }
}
await pool.end();
process.exit(failures ? 1 : 0);
