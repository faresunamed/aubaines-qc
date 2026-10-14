"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { slugify } from "@/lib/text";

const KINDS = ["epicerie", "pharmacie", "electronique", "maison", "renovation", "magasin", "restaurant", "autre"];

async function uniqueSlug(base: string) {
  const root = slugify(base) || "commerce";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    if ((await query("SELECT 1 FROM establishments WHERE slug = $1", [slug])).length === 0) return slug;
  }
  throw new Error("slug indisponible");
}

export async function approveMerchant(form: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(form.get("userId"));
  const existing = Number(form.get("establishmentId")) || null;
  const kind = KINDS.includes(String(form.get("kind"))) ? String(form.get("kind")) : "autre";
  if (!Number.isInteger(userId)) redirect("/admin");

  const [m] = await query<{ business_name: string; website: string | null }>(
    "SELECT business_name, website FROM merchant_profiles WHERE user_id = $1", [userId]);
  const [u] = await query<{ email: string; name: string; role: string }>(
    "SELECT email, name, role FROM users WHERE id = $1", [userId]);
  if (!m || !u) redirect("/admin");

  let establishmentId = existing;
  if (!establishmentId) {
    const name = String(form.get("name") ?? "").trim() || m.business_name;
    const slug = await uniqueSlug(name);
    const [e] = await query<{ id: number }>(
      "INSERT INTO establishments (slug, name, kind, website) VALUES ($1,$2,$3,$4) RETURNING id",
      [slug, name, kind, m.website]);
    establishmentId = e.id;
  }
  await query(
    "UPDATE merchant_profiles SET status='approved', establishment_id=$2, reviewed_at=now() WHERE user_id=$1",
    [userId, establishmentId]);
  if (u.role === "user") await query("UPDATE users SET role='merchant' WHERE id=$1", [userId]);

  await sendMail({
    to: u.email,
    subject: "Votre compte commerçant est approuvé — Aubaines QC",
    text: `Bonjour ${u.name},\n\nVotre compte commerçant pour « ${m.business_name} » est approuvé. Vous pouvez maintenant publier vos offres dans l'espace commerçant du site.`,
  });
  revalidatePath("/admin");
  redirect("/admin?ok=approuve");
}

export async function rejectMerchant(form: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(form.get("userId"));
  if (Number.isInteger(userId)) {
    await query("UPDATE merchant_profiles SET status='rejected', reviewed_at=now() WHERE user_id=$1", [userId]);
  }
  revalidatePath("/admin");
  redirect("/admin?ok=refuse");
}

export async function deletePromotion(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) await query("DELETE FROM promotions WHERE id = $1", [id]);
  revalidatePath("/", "layout");
  redirect("/admin?ok=supprime");
}

/** Revue des offres extraites par l'IA. « Rejeter » garde la ligne (statut rejected) pour ne pas la reproposer. */
async function setStatus(where: string, params: unknown[], status: "published" | "rejected") {
  await requireAdmin();
  await query(
    `UPDATE promotions SET status = $1${status === "published" ? ", created_at = now()" : ""}
     WHERE status = 'pending' AND ${where}`,
    [status, ...params],
  );
  revalidatePath("/", "layout");
  redirect(`/admin?ok=${status === "published" ? "publie" : "rejete"}`);
}

export async function reviewPromotion(form: FormData): Promise<void> {
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) redirect("/admin");
  await setStatus("id = $2", [id], form.get("decision") === "publish" ? "published" : "rejected");
}

export async function reviewEstablishment(form: FormData): Promise<void> {
  const id = Number(form.get("establishmentId"));
  if (!Number.isInteger(id)) redirect("/admin");
  await setStatus("establishment_id = $2", [id], form.get("decision") === "publish" ? "published" : "rejected");
}
