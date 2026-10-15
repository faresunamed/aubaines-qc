import { query } from "./db";
import { normalize } from "./text";
import { SITE_URL } from "./site";

/**
 * Géocodage (Nominatim) et recherche de succursales (Overpass) sur OpenStreetMap — gratuit.
 * Politique d'usage : User-Agent identifiable, résultats mis en cache, pas de rafales.
 * Pour un fort trafic : héberger sa propre instance ou passer à un service payant.
 */
export type Coord = { lat: number; lng: number };
export type Branch = { name: string; address: string | null; lat: number; lng: number };
export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

const UA = `AubainesQC/1.0 (+${SITE_URL})`;
const NOMINATIM = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const offline = () => process.env.PLACES_OFFLINE === "1";

export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const withTimeout = (ms: number) => ({ signal: AbortSignal.timeout(ms), headers: { "user-agent": UA, accept: "application/json" } });

/** Adresse (ou code postal) → coordonnées. null si introuvable ou service indisponible. */
export async function geocode(address: string | null, postal: string | null, f: FetchLike = fetch as any): Promise<Coord | null> {
  if (offline()) return null;
  const attempts = [address && postal ? `${address}, ${postal}, Québec, Canada` : null, address ? `${address}, Québec, Canada` : null, postal ? `${postal}, Québec, Canada` : null]
    .filter((x): x is string => !!x);
  for (const q of attempts) {
    try {
      const res = await f(`${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=ca&q=${encodeURIComponent(q)}`, withTimeout(6000));
      if (!res.ok) continue;
      const rows = await res.json();
      const lat = Number(rows?.[0]?.lat), lng = Number(rows?.[0]?.lon);
      // Garde-fou : le Québec tient dans ce cadre
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 44.9 && lat < 63 && lng > -80 && lng < -57) return { lat, lng };
    } catch { /* service indisponible : essai suivant */ }
  }
  return null;
}

/** Réponse Overpass → succursales du commerce (commerces seulement : pas les stations « Métro »). */
export function parseOverpass(json: any, brand: string): Branch[] {
  const want = normalize(brand);
  const out: Branch[] = [];
  for (const el of json?.elements ?? []) {
    const t = el.tags ?? {};
    const lat = Number(el.lat ?? el.center?.lat), lng = Number(el.lon ?? el.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!(t.shop || t.amenity === "pharmacy")) continue;
    const label = normalize(String(t.name ?? t.brand ?? ""));
    if (!label || !(label === want || label.startsWith(want + " ") || label.includes(" " + want) || normalize(String(t.brand ?? "")) === want)) continue;
    const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
    const address = [street, t["addr:city"], t["addr:postcode"]].filter(Boolean).join(", ") || null;
    out.push({ name: String(t.name ?? t.brand), address, lat, lng });
  }
  return out;
}

const esc = (s: string) => s.replace(/[\\"^$.|?*+()[\]{}]/g, "\\$&");
const gridKey = (brand: string, c: Coord) => `branches|${normalize(brand)}|${c.lat.toFixed(2)}|${c.lng.toFixed(2)}`;
const TTL_DAYS = 7;

/** Succursales candidates autour d'un point (cache 7 jours par case d'environ 1 km). */
export async function branchesNear(brand: string, at: Coord, radiusKm = 15, f: FetchLike = fetch as any): Promise<Branch[]> {
  if (offline()) return [];
  const key = gridKey(brand, at);
  try {
    const hit = await query<{ data: Branch[] }>(
      "SELECT data FROM place_cache WHERE key = $1 AND fetched_at > now() - ($2 || ' days')::interval", [key, String(TTL_DAYS)]);
    if (hit[0]) return hit[0].data;
  } catch { /* cache indisponible */ }
  try {
    const ql = `[out:json][timeout:10];nwr[~"^(name|brand)$"~"${esc(brand)}",i](around:${Math.round(radiusKm * 1000)},${at.lat},${at.lng});out center tags 60;`;
    const res = await f(`${OVERPASS}?data=${encodeURIComponent(ql)}`, withTimeout(9000));
    if (!res.ok) return [];
    const list = parseOverpass(await res.json(), brand).sort((a, b) => haversineKm(at, a) - haversineKm(at, b)).slice(0, 8);
    try {
      await query(
        `INSERT INTO place_cache (key, data, fetched_at) VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()`, [key, JSON.stringify(list)]);
    } catch { /* tant pis pour le cache */ }
    return list;
  } catch {
    return [];
  }
}

export function nearestBranch(list: Branch[], from: Coord): (Branch & { km: number }) | null {
  let best: (Branch & { km: number }) | null = null;
  for (const b of list) {
    const km = haversineKm(from, b);
    if (!best || km < best.km) best = { ...b, km };
  }
  return best;
}
