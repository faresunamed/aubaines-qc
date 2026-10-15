// Tests des succursales proches : réponses OSM simulées (aucun réseau).
import assert from "node:assert/strict";
process.env.PLACES_OFFLINE = "";
import { geocode, haversineKm, nearestBranch, parseOverpass, type FetchLike } from "../lib/places";
import { buildPlans, refinePlan, mapsLink, type ListItem, type Offer } from "../lib/shopping";

const ok = (j: any): ReturnType<FetchLike> => Promise.resolve({ ok: true, status: 200, json: async () => j });

// distance connue : Montréal → Québec ≈ 233 km
const d = haversineKm({ lat: 45.5017, lng: -73.5673 }, { lat: 46.8139, lng: -71.208 });
assert.ok(d > 225 && d < 240, `distance ${d}`);

// géocodage : réponse valide, hors Québec rejeté, erreur → null
assert.deepEqual(await geocode("123 rue X", "H2X 1A1", () => ok([{ lat: "45.51", lon: "-73.56" }])), { lat: 45.51, lng: -73.56 });
assert.equal(await geocode("x", null, () => ok([{ lat: "40.7", lon: "-74.0" }])), null);
assert.equal(await geocode("x", null, () => Promise.reject(new Error("réseau"))), null);
assert.equal(await geocode(null, null, () => ok([])), null);

// parseOverpass : garde les magasins, écarte les stations de métro
const json = { elements: [
  { lat: 45.52, lon: -73.57, tags: { shop: "supermarket", name: "Metro Plus", "addr:housenumber": "10", "addr:street": "rue Rachel", "addr:city": "Montréal" } },
  { lat: 45.50, lon: -73.56, tags: { railway: "station", name: "Metro Berri-UQAM" } },
  { center: { lat: 45.6, lon: -73.6 }, tags: { shop: "supermarket", name: "Metro" } },
  { lat: 45.5, lon: -73.5, tags: { shop: "supermarket", name: "Super C" } },
] };
const list = parseOverpass(json, "Metro");
assert.equal(list.length, 2);
assert.equal(list[0].address, "10 rue Rachel, Montréal");
const home = { lat: 45.5, lng: -73.57 };
const near = nearestBranch(list, home)!;
assert.equal(near.name, "Metro Plus");
assert.ok(near.km < 3);

// refinePlan : ordre, distance, lien Maps
const O = (id: number, est: number, name: string, title: string, price: number): Offer =>
  ({ id, title, brand: null, establishment_id: est, establishment_name: name, price, regular_price: null, unit: null, valid_to: null, zone_slug: null });
const items: ListItem[] = [{ id: 1, text: "poulet", qty: 1, promotion_id: null }, { id: 2, text: "lait", qty: 1, promotion_id: null }];
const offers = [O(1, 1, "IGA", "Poulet entier", 5), O(2, 2, "Metro", "Lait 4 L", 5)];
const { plans } = buildPlans(items, offers, { zone: "montreal", mode: "voiture", maxStops: 2, multiStore: true, postal: "H2X 1A1" });
const two = plans.find((p) => p.stops.length === 2)!;
const b = new Map<string, any>([
  ["IGA", { name: "IGA Extra", address: "5 av. Loin", lat: 45.56, lng: -73.62, km: 7 }],
  ["Metro", { name: "Metro Plus", address: "10 rue Rachel, Montréal", lat: 45.52, lng: -73.57, km: 2 }],
]);
const r = refinePlan(two, { coord: home, label: "H2X 1A1, Québec", precise: false }, b, "voiture", "montreal", "H2X 1A1");
assert.equal(r.stops[0].name, "Metro", "le plus proche d'abord");
assert.equal(r.located, true);
assert.ok(r.distanceKm > 0 && r.totalMin === r.travelMin + r.shopMin);
assert.ok(r.mapsUrl!.includes("Metro%20Plus") && r.mapsUrl!.includes("IGA%20Extra"), r.mapsUrl!);
// aucune succursale trouvée → plan inchangé
assert.equal(refinePlan(two, { coord: home, label: "x", precise: false }, new Map(), "voiture", "montreal", null), two);
// une seule trouvée → le reste garde l'estimation
const partial = refinePlan(two, { coord: home, label: "x", precise: false }, new Map([["Metro", b.get("Metro")]]), "voiture", "montreal", "H2X 1A1");
assert.equal(partial.located, false);
assert.equal(partial.stops.length, 2);
assert.equal(mapsLink(null, "voiture", ["IGA"]), null);
console.log("places OK");
