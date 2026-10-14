import { query } from "./db";
import { normalize } from "./text";

export type AlertRow = {
  id: number;
  user_id: number;
  keyword: string;
  category_id: number | null;
  establishment_id: number | null;
  min_discount: number | null;
  last_checked_at: Date;
};

export type Match = {
  id: number;
  title: string;
  price: string | null;
  regular_price: string | null;
  discount_percent: number | null;
  establishment_name: string;
  valid_to: string | null;
};

/** Offres actives créées après la dernière vérification de l'alerte. */
export async function findAlertMatches(a: AlertRow, limit = 10): Promise<Match[]> {
  const params: unknown[] = [a.last_checked_at];
  const where = [
    "p.created_at > $1",
    "(p.valid_to IS NULL OR p.valid_to >= CURRENT_DATE)",
  ];
  for (const w of normalize(a.keyword).split(" ").filter(Boolean)) {
    params.push(`%${w}%`);
    where.push(`p.search_text ILIKE $${params.length}`);
  }
  if (a.category_id) { params.push(a.category_id); where.push(`p.category_id = $${params.length}`); }
  if (a.establishment_id) { params.push(a.establishment_id); where.push(`p.establishment_id = $${params.length}`); }
  if (a.min_discount) { params.push(a.min_discount); where.push(`p.discount_percent >= $${params.length}`); }
  params.push(limit);
  return query<Match>(
    `SELECT p.id, p.title, p.price, p.regular_price, p.discount_percent, e.name AS establishment_name,
            to_char(p.valid_to,'YYYY-MM-DD') AS valid_to
     FROM promotions p JOIN establishments e ON e.id = p.establishment_id
     WHERE ${where.join(" AND ")}
     ORDER BY p.discount_percent DESC NULLS LAST, p.id
     LIMIT $${params.length}`,
    params,
  );
}

const money = (v: string | null) => (v == null ? "" : `${Number(v).toFixed(2).replace(".", ",")} $`);

export function formatMatch(m: Match) {
  const bits = [money(m.price)];
  if (m.regular_price) bits.push(`(au lieu de ${money(m.regular_price)})`);
  if (m.discount_percent) bits.push(`−${m.discount_percent} %`);
  return `• ${m.title} — ${m.establishment_name} : ${bits.filter(Boolean).join(" ")}${m.valid_to ? ` · jusqu'au ${m.valid_to}` : ""}`;
}
