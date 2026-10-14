"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireMerchant, requireUser } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { parseMoney } from "@/lib/numbers";
import { csvExternalId, safeUrl, saveMerchantPromo, type PromoInput } from "@/lib/promo-write";
import { rateLimit } from "@/lib/ratelimit";
import { normalize } from "@/lib/text";
import { sendMail } from "@/lib/mail";

export type MState = { error?: string; message?: string; errors?: string[] } | undefined;

export async function requestMerchant(_: MState, form: FormData): Promise<MState> {
  const user = await requireUser();
  if (!user.verified) return { error: "Confirmez d'abord votre courriel (lien reçu par courriel)." };

  const business = String(form.get("business") ?? "").trim();
  const website = safeUrl(String(form.get("website") ?? "").trim());
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);
  if (business.length < 2) return { error: "Indiquez le nom de votre entreprise." };
  if (!website) return { error: "Indiquez l'adresse de votre site web (https://…)." };
  if (!(await rateLimit(`merchant-req:${user.id}`, 3, 86400))) return { error: "Trop de demandes. Réessayez demain." };

  await query(
    `INSERT INTO merchant_profiles (user_id, business_name, website, phone, message)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET business_name=$2, website=$3, phone=$4, message=$5,
       status = CASE WHEN merchant_profiles.status = 'approved' THEN 'approved' ELSE 'pending' END`,
    [user.id, business, website, phone || null, message || null],
  );
  if (process.env.ADMIN_EMAIL) {
    await sendMail({
      to: process.env.ADMIN_EMAIL,
      subject: `Nouvelle demande commerçant : ${business}`,
      text: `${business} (${website}) — ${user.email}\nÀ examiner dans la console d'administration.`,
    });
  }
  revalidatePath("/commercant");
  return { message: "Demande envoyée. Nous vous répondrons après vérification." };
}

function readPromo(form: FormData): PromoInput | { error: string } {
  const price = parseMoney(form.get("price"));
  const regular = parseMoney(form.get("regularPrice"));
  if (Number.isNaN(price) || Number.isNaN(regular)) return { error: "Prix invalide." };
  return {
    title: String(form.get("title") ?? ""),
    price,
    regularPrice: regular,
    unit: String(form.get("unit") ?? ""),
    description: String(form.get("description") ?? ""),
    sourceUrl: String(form.get("sourceUrl") ?? ""),
    validFrom: String(form.get("validFrom") ?? ""),
    validTo: String(form.get("validTo") ?? ""),
    categorySlug: String(form.get("category") ?? ""),
  };
}

export async function createOffer(_: MState, form: FormData): Promise<MState> {
  const { user, establishmentId } = await requireMerchant();
  if (!(await rateLimit(`offer:${user.id}`, 300, 86400))) return { error: "Limite quotidienne atteinte." };
  const input = readPromo(form);
  if ("error" in input) return input;
  const res = await saveMerchantPromo(establishmentId, user.id, input);
  if ("error" in res) return res;
  revalidatePath("/", "layout");
  redirect("/commercant/offres?ok=1");
}

export async function updateOffer(_: MState, form: FormData): Promise<MState> {
  const { user, establishmentId } = await requireMerchant();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return { error: "Offre introuvable." };
  const input = readPromo(form);
  if ("error" in input) return input;
  const res = await saveMerchantPromo(establishmentId, user.id, input, { existingId: id });
  if ("error" in res) return res;
  revalidatePath("/", "layout");
  redirect("/commercant/offres?ok=1");
}

export async function deleteOffer(form: FormData): Promise<void> {
  const { establishmentId } = await requireMerchant();
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) {
    await query("DELETE FROM promotions WHERE id=$1 AND establishment_id=$2 AND source='merchant'", [id, establishmentId]);
  }
  revalidatePath("/", "layout");
  redirect("/commercant/offres");
}

const HEADERS: Record<string, string> = {
  titre: "title", title: "title", produit: "title", nom: "title",
  prix: "price", price: "price", prix_promo: "price", prix_en_promotion: "price",
  prix_regulier: "regularPrice", regular_price: "regularPrice", prix_normal: "regularPrice",
  unite: "unit", unit: "unit",
  debut: "validFrom", start: "validFrom", valid_from: "validFrom", date_debut: "validFrom",
  fin: "validTo", end: "validTo", valid_to: "validTo", date_fin: "validTo",
  url: "sourceUrl", lien: "sourceUrl",
  description: "description",
  categorie: "category", category: "category",
};

export async function importCsv(_: MState, form: FormData): Promise<MState> {
  const { user, establishmentId } = await requireMerchant();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier CSV." };
  if (file.size > 1_000_000) return { error: "Fichier trop volumineux (1 Mo maximum)." };
  if (!(await rateLimit(`csv:${user.id}`, 20, 86400))) return { error: "Limite quotidienne d'imports atteinte." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "Le fichier doit contenir une ligne d'en-tête et au moins une ligne de données." };
  if (rows.length > 501) return { error: "Maximum 500 lignes par import." };

  const header = rows[0].map((h) => HEADERS[normalize(h).replace(/ /g, "_")] ?? "");
  if (!header.includes("title") || !header.includes("price"))
    return { error: "Colonnes requises : titre et prix. Voir le modèle de fichier." };

  const errors: string[] = [];
  let ok = 0;
  for (const [idx, r] of rows.slice(1).entries()) {
    const rec: Record<string, string> = {};
    header.forEach((k, i) => { if (k) rec[k] = (r[i] ?? "").trim(); });
    const price = parseMoney(rec.price);
    const regular = parseMoney(rec.regularPrice);
    if (Number.isNaN(price) || Number.isNaN(regular)) { errors.push(`Ligne ${idx + 2} : prix invalide.`); continue; }
    const from = rec.validFrom || new Date().toISOString().slice(0, 10);
    const res = await saveMerchantPromo(establishmentId, user.id, {
      title: rec.title ?? "",
      price, regularPrice: regular,
      unit: rec.unit, description: rec.description, sourceUrl: rec.sourceUrl,
      validFrom: from, validTo: rec.validTo, categorySlug: rec.category,
      externalId: csvExternalId(rec.title ?? "", from),
    });
    if ("error" in res) errors.push(`Ligne ${idx + 2} : ${res.error}`);
    else ok++;
  }
  revalidatePath("/", "layout");
  return {
    message: `${ok} offre${ok > 1 ? "s" : ""} importée${ok > 1 ? "s" : ""}.`,
    errors: errors.slice(0, 20),
    error: ok === 0 ? "Aucune offre importée." : undefined,
  };
}
