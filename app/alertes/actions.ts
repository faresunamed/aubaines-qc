"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalize } from "@/lib/text";

export type AState = { error?: string; message?: string } | undefined;

export async function createAlert(_: AState, form: FormData): Promise<AState> {
  const user = await requireUser();
  if (!user.verified) return { error: "Confirmez d'abord votre courriel pour créer des alertes." };

  const keyword = normalize(String(form.get("keyword") ?? "")).slice(0, 60);
  const categoryId = Number(form.get("category")) || null;
  const establishmentId = Number(form.get("establishment")) || null;
  const minDiscount = Number(form.get("minDiscount")) || null;
  if (!keyword && !categoryId && !establishmentId)
    return { error: "Indiquez un mot-clé, un type de produit ou un établissement." };
  if (minDiscount != null && (minDiscount < 1 || minDiscount > 90)) return { error: "Rabais minimum entre 1 et 90 %." };

  const [{ n }] = await query<{ n: number }>("SELECT count(*)::int AS n FROM alerts WHERE user_id = $1", [user.id]);
  if (n >= 20) return { error: "Vous avez atteint la limite de 20 alertes." };

  await query(
    "INSERT INTO alerts (user_id, keyword, category_id, establishment_id, min_discount) VALUES ($1,$2,$3,$4,$5)",
    [user.id, keyword, categoryId, establishmentId, minDiscount],
  );
  await query("UPDATE users SET alerts_opt_out = FALSE WHERE id = $1", [user.id]);
  revalidatePath("/alertes");
  return { message: "Alerte créée. Vous recevrez un courriel quand de nouvelles offres correspondent." };
}

export async function deleteAlert(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) await query("DELETE FROM alerts WHERE id = $1 AND user_id = $2", [id, user.id]);
  revalidatePath("/alertes");
}

export async function unsubscribe(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  if (/^[0-9a-f]{48}$/.test(token)) {
    await query("UPDATE users SET alerts_opt_out = TRUE WHERE unsubscribe_token = $1", [token]);
  }
}
