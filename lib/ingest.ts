import { pool } from "./db";
import { CATEGORIES } from "./categories";
import { classify } from "./classifier";
import { normalize } from "./text";
import type { Collector } from "../collectors/types";

export async function ensureCategories() {
  for (const [i, c] of CATEGORIES.entries()) {
    await pool.query(
      `INSERT INTO categories (slug, name, group_name, sort) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, group_name = EXCLUDED.group_name, sort = EXCLUDED.sort`,
      [c.slug, c.name, c.group, i],
    );
  }
}

export async function ingest(collector: Collector) {
  const started = new Date();
  const raws = await collector.fetch();
  const est = collector.establishment;

  const { rows: estRows } = await pool.query(
    `INSERT INTO establishments (slug, name, kind, website, color) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind,
       website = EXCLUDED.website, color = EXCLUDED.color
     RETURNING id`,
    [est.slug, est.name, est.kind, est.website ?? null, est.color ?? "#444444"],
  );
  const establishmentId: number = estRows[0].id;

  const { rows: cats } = await pool.query(`SELECT id, slug FROM categories`);
  const catId = new Map<string, number>(cats.map((c: any) => [c.slug, c.id]));

  let count = 0;
  for (const p of raws) {
    const cls = classify(p.title, `${p.brand ?? ""} ${p.description ?? ""}`, p.categoryHint);
    const categoryId = catId.get(cls.slug) ?? catId.get("autre")!;
    let pct = p.discountPercent;
    if (pct == null && p.price != null && p.regularPrice && p.regularPrice > p.price) {
      pct = Math.round((1 - p.price / p.regularPrice) * 100);
    }
    await pool.query(
      `INSERT INTO promotions
        (establishment_id, category_id, external_id, title, brand, description, price,
         regular_price, discount_percent, unit, image_url, source_url, valid_from, valid_to,
         search_text, is_demo, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
       ON CONFLICT (establishment_id, external_id) DO UPDATE SET
         category_id = EXCLUDED.category_id, title = EXCLUDED.title, brand = EXCLUDED.brand,
         description = EXCLUDED.description, price = EXCLUDED.price,
         regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent,
         unit = EXCLUDED.unit, image_url = EXCLUDED.image_url, source_url = EXCLUDED.source_url,
         valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to,
         search_text = EXCLUDED.search_text, is_demo = EXCLUDED.is_demo, updated_at = now()`,
      [
        establishmentId, categoryId, p.externalId, p.title, p.brand ?? null,
        p.description ?? null, p.price ?? null, p.regularPrice ?? null, pct ?? null,
        p.unit ?? null, p.imageUrl ?? null, p.sourceUrl ?? null, p.validFrom ?? null,
        p.validTo ?? null,
        normalize(`${p.title} ${p.brand ?? ""} ${est.name}`),
        collector.demo === true,
      ],
    );
    count++;
  }

  // Nettoyage : si on a reçu des données, retirer ce commerce des lignes périmées
  // (non mises à jour pendant cette collecte) et des lignes de démo.
  if (count > 0) {
    await pool.query(
      `DELETE FROM promotions
       WHERE establishment_id = $1 AND source = 'collector'
         AND (updated_at < $2 OR (is_demo AND $3 = FALSE))`,
      [establishmentId, started, collector.demo === true],
    );
  }
  return count;
}
