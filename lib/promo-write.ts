import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { query } from "./db";
import { classify } from "./classifier";
import { normalize } from "./text";

export type PromoInput = {
  title: string;
  price?: number | null;
  regularPrice?: number | null;
  unit?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  categorySlug?: string | null; // vide = classification automatique
  externalId?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s: string) => DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: string, n: number) => {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export function safeUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Valide et normalise ; renvoie un message d'erreur en français ou la donnée propre. */
export function validatePromo(i: PromoInput): { error: string } | { data: Required<Omit<PromoInput, "externalId" | "categorySlug">> & { categorySlug: string | null } } {
  const title = (i.title ?? "").trim();
  if (title.length < 3) return { error: "Le titre est requis (3 caractères minimum)." };
  if (title.length > 140) return { error: "Le titre est trop long (140 caractères maximum)." };

  const price = i.price ?? null;
  const regular = i.regularPrice ?? null;
  if (price == null && regular == null) return { error: "Indiquez au moins le prix en promotion." };
  for (const v of [price, regular]) {
    if (v != null && (!(v > 0) || v >= 100000)) return { error: "Les prix doivent être entre 0,01 $ et 99 999 $." };
  }
  if (price != null && regular != null && regular < price)
    return { error: "Le prix régulier doit être supérieur ou égal au prix en promotion." };

  const from = i.validFrom && i.validFrom !== "" ? i.validFrom : today();
  const to = i.validTo && i.validTo !== "" ? i.validTo : plusDays(from, 6);
  if (!isDate(from) || !isDate(to)) return { error: "Dates invalides (format AAAA-MM-JJ)." };
  if (to < from) return { error: "La date de fin doit être après la date de début." };
  if (to < today()) return { error: "La date de fin est déjà passée." };

  return {
    data: {
      title,
      price,
      regularPrice: regular,
      unit: (i.unit ?? "").trim().slice(0, 20) || null,
      description: (i.description ?? "").trim().slice(0, 1000) || null,
      sourceUrl: safeUrl(i.sourceUrl),
      validFrom: from,
      validTo: to,
      categorySlug: i.categorySlug || null,
    },
  };
}

/** Insère ou met à jour une offre de commerçant. Si externalId est fourni, c'est un upsert. */
export async function saveMerchantPromo(
  establishmentId: number,
  userId: number,
  input: PromoInput,
  opts: { existingId?: number } = {},
): Promise<{ error: string } | { id: number }> {
  const v = validatePromo(input);
  if ("error" in v) return v;
  const d = v.data;

  const [est] = await query<{ name: string }>("SELECT name FROM establishments WHERE id = $1", [establishmentId]);
  const catSlug = d.categorySlug ?? classify(d.title, d.description ?? "").slug;
  const [cat] = await query<{ id: number }>("SELECT id FROM categories WHERE slug = $1", [catSlug]);
  const [autre] = await query<{ id: number }>("SELECT id FROM categories WHERE slug = 'autre'");
  const categoryId = cat?.id ?? autre.id;

  const pct =
    d.price != null && d.regularPrice && d.regularPrice > d.price
      ? Math.round((1 - d.price / d.regularPrice) * 100)
      : null;
  const searchText = normalize(`${d.title} ${est?.name ?? ""}`);

  if (opts.existingId) {
    const rows = await query<{ id: number }>(
      `UPDATE promotions SET category_id=$3, title=$4, description=$5, price=$6, regular_price=$7,
         discount_percent=$8, unit=$9, source_url=$10, valid_from=$11, valid_to=$12, search_text=$13, updated_at=now()
       WHERE id=$1 AND establishment_id=$2 AND source='merchant' RETURNING id`,
      [opts.existingId, establishmentId, categoryId, d.title, d.description, d.price, d.regularPrice, pct, d.unit, d.sourceUrl, d.validFrom, d.validTo, searchText],
    );
    return rows[0] ? { id: rows[0].id } : { error: "Offre introuvable." };
  }

  const externalId =
    input.externalId ?? `m-${randomUUID()}`;
  const rows = await query<{ id: number }>(
    `INSERT INTO promotions (establishment_id, category_id, external_id, title, description, price, regular_price,
       discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,FALSE,'merchant',$14)
     ON CONFLICT (establishment_id, external_id) DO UPDATE SET
       category_id=EXCLUDED.category_id, title=EXCLUDED.title, description=EXCLUDED.description,
       price=EXCLUDED.price, regular_price=EXCLUDED.regular_price, discount_percent=EXCLUDED.discount_percent,
       unit=EXCLUDED.unit, source_url=EXCLUDED.source_url, valid_from=EXCLUDED.valid_from,
       valid_to=EXCLUDED.valid_to, search_text=EXCLUDED.search_text, updated_at=now()
     RETURNING id`,
    [establishmentId, categoryId, externalId, d.title, d.description, d.price, d.regularPrice, pct, d.unit, d.sourceUrl, d.validFrom, d.validTo, searchText, userId],
  );
  return { id: rows[0].id };
}

export const csvExternalId = (title: string, from: string) =>
  "csv-" + createHash("sha1").update(normalize(title) + "|" + from).digest("hex").slice(0, 16);
