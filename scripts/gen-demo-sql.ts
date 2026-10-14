// Génère db/demo-data.sql : données FICTIVES de démonstration, à coller dans l'éditeur SQL.
// Dates relatives (aujourd'hui −2 → +5) pour que les offres restent visibles.
// Usage : npm run gen:demo-sql
import fs from "node:fs";
import { demoCollectors } from "../collectors/demo";
import { classify } from "../lib/classifier";
import { normalize } from "../lib/text";

const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const out: string[] = [
  "-- Données FICTIVES de démonstration (aucun prix réel). Idempotent : peut être relancé.",
  "-- Pour tout retirer plus tard :  DELETE FROM promotions WHERE is_demo;",
  "-- (les commerces de démo restent ; supprimez-les au besoin avec DELETE FROM establishments WHERE slug IN (...)).",
  "",
];

let n = 0;
for (const c of demoCollectors()) {
  const e = c.establishment;
  out.push(
    `INSERT INTO establishments (slug, name, kind, website, color) VALUES (${q(e.slug)}, ${q(e.name)}, ${q(e.kind)}, ${q(e.website ?? "")}, ${q(e.color ?? "#444444")})`,
    `ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;`,
  );
  const items = await c.fetch();
  const rows = items.map((p, i) => {
    const cat = classify(p.title, "", p.categoryHint).slug;
    const pct = p.price != null && p.regularPrice && p.regularPrice > p.price ? Math.round((1 - p.price / p.regularPrice) * 100) : null;
    n++;
    return (
      `SELECT e.id, c.id, ${q(`demo-${e.slug}-${i}`)}, ${q(p.title)}, ${p.price ?? "NULL"}, ${p.regularPrice ?? "NULL"}, ${pct ?? "NULL"}, ` +
      `${p.unit ? q(p.unit) : "NULL"}, ${q(e.website ?? "")}, CURRENT_DATE - 2, CURRENT_DATE + 5, ${q(normalize(`${p.title} ${e.name}`))} ` +
      `FROM establishments e, categories c WHERE e.slug = ${q(e.slug)} AND c.slug = ${q(cat)}`
    );
  });
  out.push(
    `INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)`,
    `SELECT s.*, TRUE, 'collector' FROM (`,
    rows.join("\nUNION ALL\n"),
    `) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)`,
    `ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,`,
    `  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,`,
    `  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();`,
    "",
  );
}
fs.writeFileSync("db/demo-data.sql", out.join("\n"));
console.log(`db/demo-data.sql : ${n} promotions fictives`);
