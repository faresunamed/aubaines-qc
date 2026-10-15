import { query } from "./db";
import { offersForZone, type ListItem, type Offer } from "./shopping";

export type Prefs = {
  postal_code: string | null; zone_slug: string | null; mode: string; multi_store: boolean; max_stops: number;
  address: string | null; lat: number | null; lng: number | null; geo_precise: boolean;
};
export const MAX_ITEMS = 40;

export async function getPrefs(userId: number): Promise<Prefs> {
  const [p] = await query<Prefs>(
    "SELECT postal_code, zone_slug, mode, multi_store, max_stops, address, lat, lng, geo_precise FROM shopping_prefs WHERE user_id = $1", [userId]);
  if (!p) return { postal_code: null, zone_slug: null, mode: "voiture", multi_store: true, max_stops: 3, address: null, lat: null, lng: null, geo_precise: false };
  return { ...p, lat: p.lat == null ? null : Number(p.lat), lng: p.lng == null ? null : Number(p.lng) };
}

export async function getItems(userId: number): Promise<ListItem[]> {
  return query<ListItem>(
    "SELECT id, text, qty, promotion_id FROM shopping_items WHERE user_id = $1 ORDER BY id", [userId]);
}

/** Offres actives avec un prix, valables pour la zone (le prix NUMERIC revient en nombre). */
export async function loadOffers(zone: string): Promise<Offer[]> {
  const rows = await query<any>(
    `SELECT p.id, p.title, p.brand, p.price, p.regular_price, p.unit, p.zone_slug,
            to_char(p.valid_to,'YYYY-MM-DD') AS valid_to,
            e.id AS establishment_id, e.name AS establishment_name
     FROM promotions p JOIN establishments e ON e.id = p.establishment_id
     WHERE p.status = 'published' AND p.price IS NOT NULL AND p.price > 0
       AND (p.valid_to IS NULL OR p.valid_to >= CURRENT_DATE)
       AND (p.zone_slug IS NULL OR p.zone_slug = $1)
     LIMIT 20000`, [zone]);
  return offersForZone(
    rows.map((r: any) => ({ ...r, price: Number(r.price), regular_price: r.regular_price == null ? null : Number(r.regular_price) })),
    zone,
  );
}
