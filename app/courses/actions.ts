"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MAX_ITEMS } from "@/lib/shopping-db";
import { MODES } from "@/lib/shopping";
import { normalizePostal, zoneFromPostal, zoneBySlug } from "@/lib/zones";

export async function addItem(form: FormData): Promise<void> {
  const user = await requireUser();
  const text = String(form.get("text") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const qty = Math.min(99, Math.max(1, Math.floor(Number(form.get("qty")) || 1)));
  if (text.length < 2) redirect("/courses?erreur=article");
  const [{ n }] = await query<{ n: number }>("SELECT count(*)::int AS n FROM shopping_items WHERE user_id = $1", [user.id]);
  if (n >= MAX_ITEMS) redirect("/courses?erreur=limite");
  await query("INSERT INTO shopping_items (user_id, text, qty) VALUES ($1,$2,$3)", [user.id, text, qty]);
  revalidatePath("/courses");
  redirect("/courses");
}

export async function removeItem(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) await query("DELETE FROM shopping_items WHERE id = $1 AND user_id = $2", [id, user.id]);
  revalidatePath("/courses");
  redirect("/courses");
}

export async function clearList(): Promise<void> {
  const user = await requireUser();
  await query("DELETE FROM shopping_items WHERE user_id = $1", [user.id]);
  revalidatePath("/courses");
  redirect("/courses");
}

export async function savePrefs(form: FormData): Promise<void> {
  const user = await requireUser();
  const rawPostal = String(form.get("postal") ?? "").trim();
  const postal = rawPostal ? normalizePostal(rawPostal) : null;
  if (rawPostal && !postal) redirect("/courses?erreur=postal");
  const chosen = String(form.get("zone") ?? "");
  // « auto » (ou valeur inconnue) = zone déduite du code postal
  const zone = chosen !== "auto" && zoneBySlug(chosen) ? chosen : zoneFromPostal(postal);
  const mode = MODES.some((m) => m.value === form.get("mode")) ? String(form.get("mode")) : "voiture";
  const multi = form.get("multi") === "on";
  const maxStops = Math.min(4, Math.max(1, Math.floor(Number(form.get("max")) || 3)));
  await query(
    `INSERT INTO shopping_prefs (user_id, postal_code, zone_slug, mode, multi_store, max_stops, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (user_id) DO UPDATE SET postal_code = EXCLUDED.postal_code, zone_slug = EXCLUDED.zone_slug,
       mode = EXCLUDED.mode, multi_store = EXCLUDED.multi_store, max_stops = EXCLUDED.max_stops, updated_at = now()`,
    [user.id, postal, zone, mode, multi, maxStops],
  );
  revalidatePath("/courses");
  redirect("/courses");
}

/** Ajoute (ou retire) une offre de la liste depuis une carte de promotion. */
export async function toggleListItem(promotionId: number): Promise<void> {
  const user = await requireUser();
  const removed = await query(
    "DELETE FROM shopping_items WHERE user_id = $1 AND promotion_id = $2 RETURNING 1", [user.id, promotionId]);
  if (removed.length === 0) {
    const [{ n }] = await query<{ n: number }>("SELECT count(*)::int AS n FROM shopping_items WHERE user_id = $1", [user.id]);
    if (n >= MAX_ITEMS) redirect("/courses?erreur=limite");
    const [p] = await query<{ title: string }>("SELECT title FROM promotions WHERE id = $1 AND status = 'published'", [promotionId]);
    if (!p) return;
    await query("INSERT INTO shopping_items (user_id, text, qty, promotion_id) VALUES ($1,$2,1,$3)", [user.id, p.title.slice(0, 80), promotionId]);
  }
  revalidatePath("/", "layout");
}
