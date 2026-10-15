import { query } from "./db";
import { normalize } from "./text";

export type Promo = {
  id: number;
  title: string;
  brand: string | null;
  price: string | null;
  regular_price: string | null;
  discount_percent: number | null;
  unit: string | null;
  image_url: string | null;
  source_url: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_demo: boolean;
  establishment_name: string;
  establishment_slug: string;
  establishment_color: string;
  category_name: string;
  category_slug: string;
  is_favorite: boolean;
  in_list?: boolean;
};

export type Filters = {
  q?: string;
  categorie?: string;
  etablissement?: string;
  tri?: string;
  page?: number;
};

export const PAGE_SIZE = 24;

const ORDER: Record<string, string> = {
  rabais: "p.discount_percent DESC NULLS LAST, p.id",
  prix: "p.price ASC NULLS LAST, p.id",
  fin: "p.valid_to ASC NULLS LAST, p.id",
  recent: "p.updated_at DESC, p.id",
};

export async function searchPromotions(f: Filters, userId?: number) {
  const where: string[] = ["p.status = 'published'", "(p.valid_to IS NULL OR p.valid_to >= CURRENT_DATE)"];
  const params: unknown[] = [];
  const add = (v: unknown) => (params.push(v), `$${params.length}`);

  if (f.q) {
    for (const raw of normalize(f.q).split(" ").filter(Boolean)) {
      // « viandes » trouve aussi « viande » ; un mot de catégorie (« viandes », « boissons ») ratisse toute la catégorie
      const word = raw.length > 3 ? raw.replace(/(s|x)$/, "") : raw;
      const ph = add(`%${word}%`);
      where.push(`(p.search_text ILIKE ${ph} OR c.slug ILIKE ${ph})`);
    }
  }
  if (f.categorie) where.push(`c.slug = ${add(f.categorie)}`);
  if (f.etablissement) where.push(`e.slug = ${add(f.etablissement)}`);

  const whereSql = where.join(" AND ");
  const order = ORDER[f.tri ?? "rabais"] ?? ORDER.rabais;
  const page = Math.max(1, f.page ?? 1);

  const countParams = [...params];
  const uid = add(userId ?? 0);
  const rows = await query<Promo>(
    `SELECT p.id, p.title, p.brand, p.price, p.regular_price, p.discount_percent, p.unit,
            p.image_url, p.source_url, to_char(p.valid_from,'YYYY-MM-DD') AS valid_from,
            to_char(p.valid_to,'YYYY-MM-DD') AS valid_to, p.is_demo,
            e.name AS establishment_name, e.slug AS establishment_slug, e.color AS establishment_color,
            c.name AS category_name, c.slug AS category_slug,
            (f.user_id IS NOT NULL) AS is_favorite,
            (si.id IS NOT NULL) AS in_list
     FROM promotions p
     JOIN establishments e ON e.id = p.establishment_id
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN favorites f ON f.promotion_id = p.id AND f.user_id = ${uid}
     LEFT JOIN shopping_items si ON si.promotion_id = p.id AND si.user_id = ${uid}
     WHERE ${whereSql}
     ORDER BY ${order}
     LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );

  const [{ count }] = await query<{ count: string }>(
    `SELECT count(*) FROM promotions p
     JOIN establishments e ON e.id = p.establishment_id
     JOIN categories c ON c.id = p.category_id
     WHERE ${whereSql}`,
    countParams,
  );
  return { rows, total: Number(count), page };
}

/** Compteurs des listes : tiennent compte de la recherche et de l'AUTRE filtre actif, pour qu'un clic ne mène jamais à 0 résultat. */
export async function getFacets(f: Filters = {}) {
  const base = (extra: string[], params: unknown[]) => {
    if (f.q) {
      for (const raw of normalize(f.q).split(" ").filter(Boolean)) {
        const word = raw.length > 3 ? raw.replace(/(s|x)$/, "") : raw;
        params.push(`%${word}%`);
        extra.push(`(p.search_text ILIKE $${params.length} OR c2.slug ILIKE $${params.length})`);
      }
    }
  };
  const catParams: unknown[] = [];
  const catWhere: string[] = [];
  base(catWhere, catParams);
  if (f.etablissement) { catParams.push(f.etablissement); catWhere.push(`e2.slug = $${catParams.length}`); }
  const categories = await query<{ slug: string; name: string; group_name: string; n: number }>(
    `SELECT c.slug, c.name, c.group_name, count(x.id)::int AS n
     FROM categories c
     LEFT JOIN (
       SELECT p.id, p.category_id FROM promotions p
       JOIN categories c2 ON c2.id = p.category_id
       JOIN establishments e2 ON e2.id = p.establishment_id
       WHERE p.status = 'published' AND (p.valid_to IS NULL OR p.valid_to >= CURRENT_DATE)
       ${catWhere.length ? "AND " + catWhere.join(" AND ") : ""}
     ) x ON x.category_id = c.id
     GROUP BY c.id ORDER BY c.sort`,
    catParams,
  );
  const estParams: unknown[] = [];
  const estWhere: string[] = [];
  base(estWhere, estParams);
  if (f.categorie) { estParams.push(f.categorie); estWhere.push(`c2.slug = $${estParams.length}`); }
  const establishments = await query<{ slug: string; name: string; kind: string; n: number }>(
    `SELECT e.slug, e.name, e.kind, count(x.id)::int AS n
     FROM establishments e
     LEFT JOIN (
       SELECT p.id, p.establishment_id FROM promotions p
       JOIN categories c2 ON c2.id = p.category_id
       WHERE p.status = 'published' AND (p.valid_to IS NULL OR p.valid_to >= CURRENT_DATE)
       ${estWhere.length ? "AND " + estWhere.join(" AND ") : ""}
     ) x ON x.establishment_id = e.id
     GROUP BY e.id ORDER BY e.name`,
    estParams,
  );
  return { categories, establishments };
}

export async function getFavorites(userId: number) {
  return query<Promo>(
    `SELECT p.id, p.title, p.brand, p.price, p.regular_price, p.discount_percent, p.unit,
            p.image_url, p.source_url, to_char(p.valid_from,'YYYY-MM-DD') AS valid_from,
            to_char(p.valid_to,'YYYY-MM-DD') AS valid_to, p.is_demo,
            e.name AS establishment_name, e.slug AS establishment_slug, e.color AS establishment_color,
            c.name AS category_name, c.slug AS category_slug, TRUE AS is_favorite
     FROM favorites f
     JOIN promotions p ON p.id = f.promotion_id
     JOIN establishments e ON e.id = p.establishment_id
     JOIN categories c ON c.id = p.category_id
     WHERE f.user_id = $1 AND p.status = 'published'
     ORDER BY f.created_at DESC`,
    [userId],
  );
}

export async function hasDemoData() {
  const [r] = await query<{ demo: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM promotions WHERE is_demo AND status = 'published') AS demo`,
  );
  return r.demo;
}
