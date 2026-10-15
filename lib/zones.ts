/**
 * Zones de prix et de déplacement. Approximation grossière : la zone se déduit des
 * deux premiers caractères du code postal (ex. H2 → Montréal). L'utilisateur peut la corriger.
 * legKm  = distance moyenne maison ↔ magasin ; betweenKm = distance moyenne entre deux magasins.
 */
export type Zone = { slug: string; name: string; legKm: number; betweenKm: number; lat?: number; lng?: number };

export const ZONES: Zone[] = [
  { lat: 45.5017, lng: -73.5673, slug: "montreal", name: "Montréal", legKm: 3, betweenKm: 3 },
  { lat: 45.6066, lng: -73.7124, slug: "laval", name: "Laval", legKm: 4, betweenKm: 4 },
  { lat: 45.5312, lng: -73.5181, slug: "rive-sud", name: "Rive-Sud de Montréal", legKm: 4.5, betweenKm: 4.5 },
  { lat: 46.8139, lng: -71.208, slug: "quebec", name: "Québec", legKm: 4, betweenKm: 4 },
  { lat: 46.8032, lng: -71.1779, slug: "levis", name: "Lévis", legKm: 5, betweenKm: 5 },
  { lat: 45.4765, lng: -75.7013, slug: "gatineau", name: "Gatineau / Outaouais", legKm: 5, betweenKm: 5 },
  { lat: 45.4042, lng: -71.8929, slug: "sherbrooke", name: "Sherbrooke", legKm: 4, betweenKm: 4 },
  { lat: 46.3432, lng: -72.5477, slug: "trois-rivieres", name: "Trois-Rivières", legKm: 4, betweenKm: 4 },
  { lat: 48.428, lng: -71.068, slug: "saguenay", name: "Saguenay", legKm: 5, betweenKm: 5 },
  { slug: "autre", name: "Autre région du Québec", legKm: 8, betweenKm: 8 },
];

const PREFIX: Record<string, string> = {
  H1: "montreal", H2: "montreal", H3: "montreal", H4: "montreal", H8: "montreal", H9: "montreal",
  H7: "laval",
  J3: "rive-sud", J4: "rive-sud",
  G1: "quebec", G2: "quebec", G3: "quebec",
  G6: "levis",
  J8: "gatineau", J9: "gatineau",
  J1: "sherbrooke",
  G9: "trois-rivieres",
  G7: "saguenay",
};

export const zoneBySlug = (slug?: string | null) => ZONES.find((z) => z.slug === slug);

/** « h2x 1a1 » → « H2X 1A1 » ; null si le format est invalide ou hors Québec (H, J, G). */
export function normalizePostal(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(c)) return null;
  if (!"HJG".includes(c[0])) return null;
  return `${c.slice(0, 3)} ${c.slice(3)}`;
}

export function zoneFromPostal(postal: string | null | undefined): string {
  if (!postal) return "autre";
  return PREFIX[postal.toUpperCase().slice(0, 2)] ?? "autre";
}
