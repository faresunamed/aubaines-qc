import assert from "node:assert/strict";
import { buildPlans, itemTokens, mapsLink, matchItem, offersForZone, type ListItem, type Offer } from "../lib/shopping";
import { normalizePostal, zoneFromPostal } from "../lib/zones";

let id = 0;
const O = (est: number, name: string, title: string, price: number, extra: Partial<Offer> = {}): Offer =>
  ({ id: ++id, title, brand: null, establishment_id: est, establishment_name: name, price, regular_price: null, unit: null, valid_to: null, zone_slug: null, ...extra });
const I = (text: string, qty = 1, promotion_id: number | null = null): ListItem => ({ id: ++id, text, qty, promotion_id });

// --- mots-clés
assert.deepEqual(itemTokens("Des Pommes de terre"), ["pomme", "terre"]);
assert.deepEqual(itemTokens("Œufs"), ["oeuf"]);

// --- zones / code postal
assert.equal(normalizePostal("h2x1a1"), "H2X 1A1");
assert.equal(normalizePostal("K1A 0B1"), null); // hors Québec
assert.equal(normalizePostal("abc"), null);
assert.equal(zoneFromPostal("H2X 1A1"), "montreal");
assert.equal(zoneFromPostal("H7N 1A1"), "laval");
assert.equal(zoneFromPostal("G1R 2B2"), "quebec");
assert.equal(zoneFromPostal("J9A 1A1"), "gatineau");
assert.equal(zoneFromPostal("G0A 1A1"), "autre");
assert.equal(zoneFromPostal(null), "autre");

// --- scénario : IGA (1), Metro (2), Maxi (3)
const offers = [
  O(1, "IGA", "Poulet entier frais", 4.99, { regular_price: 7.99 }),
  O(2, "Metro", "Poulet entier frais", 5.49),
  O(3, "Maxi", "Poulet entier frais", 4.49, { regular_price: 7.99 }),
  O(1, "IGA", "Lait 2 % 4 L", 5.99),
  O(2, "Metro", "Lait 2 % 4 L", 5.49),
  O(2, "Metro", "Pain tranché", 1.99),
  O(3, "Maxi", "Pain tranché", 2.49),
  O(1, "IGA", "Pommes McIntosh 3 lb", 3.99),
];
const items = [I("poulet"), I("lait"), I("pain"), I("pommes", 2), I("licorne en peluche")];

// appariement : la moins chère par commerce
const m = matchItem(items[0], offers);
assert.equal(m.size, 3);
assert.equal(m.get(3)!.price, 4.49);
assert.equal(matchItem(items[4], offers).size, 0);

const opt = { zone: "montreal", mode: "voiture", maxStops: 3, multiStore: true, postal: "H2X 1A1" };
const { plans, unmatched } = buildPlans(items, offers, opt);
assert.deepEqual(unmatched.map((u) => u.text), ["licorne en peluche"]);
assert(plans.length >= 2);
const byLabel = (l: string) => plans.find((p) => p.labels.includes(l))!;
const cheapest = byLabel("Le moins cher"), single = byLabel("Un seul magasin"), fast = byLabel("Le plus rapide");
// chaque plan couvre les 4 articles trouvables
assert.equal(cheapest.uncovered.length, 1, "seul l'article introuvable reste sans prix");
assert.equal(fast.uncovered.length, 1);
assert(single.uncovered.length >= 1);
assert(single.uncovered.some((u) => u.text === "licorne en peluche"));
assert.equal(single.stops.length, 1);
assert(single.uncovered.length >= cheapest.uncovered.length, "un seul magasin couvre au plus autant");
assert(fast.totalMin <= cheapest.totalMin, "le plus rapide ≤ le moins cher en durée");
// total du plus économique : poulet Maxi 4.49 + lait Metro 5.49 + pain Metro 1.99 + pommes IGA 3.99×2 = 19.95
assert.equal(cheapest.total, 19.95);
assert.equal(Math.round(cheapest.stops.reduce((s, st) => s + st.subtotal, 0) * 100) / 100, cheapest.total);
assert.equal(cheapest.savings, 3.5);
assert(cheapest.mapsUrl!.startsWith("https://www.google.com/maps/dir/?api=1"));
assert(cheapest.mapsUrl!.includes("travelmode=driving"));
// durée = trajet + magasinage
assert.equal(cheapest.totalMin, cheapest.travelMin + cheapest.shopMin);
assert(cheapest.travelMin > 0 && cheapest.shopMin > 0);

// mode de transport : à pied est plus long qu'en auto
const walk = buildPlans(items, offers, { ...opt, mode: "marche" }).plans.find((p) => p.key === cheapest.key)!;
assert(walk.travelMin > cheapest.travelMin);

// un seul magasin imposé
const mono = buildPlans(items, offers, { ...opt, multiStore: false });
assert(mono.plans.length === 1 && mono.plans[0].stops.length === 1);
// limite d'arrêts
const two = buildPlans(items, offers, { ...opt, maxStops: 2 });
assert(two.plans.every((p) => p.stops.length <= 2));

// liste vide / sans correspondance
assert.equal(buildPlans([], offers, opt).plans.length, 0);
assert.equal(buildPlans([I("zzz")], offers, opt).plans.length, 0);

// article choisi depuis une offre : même produit comparé dans les autres commerces
const chosen = offers[0]; // poulet IGA
const viaOffer = matchItem(I("Poulet entier frais", 1, chosen.id), offers);
assert.equal(viaOffer.size, 3);

// zones : variante de zone prioritaire, autre zone écartée
const zo = offersForZone([
  O(1, "IGA", "Lait 2 % 4 L", 5.99),
  O(1, "IGA", "Lait 2 % 4 L", 6.49, { zone_slug: "montreal" }),
  O(1, "IGA", "Lait 2 % 4 L", 4.99, { zone_slug: "quebec" }),
], "montreal");
assert.equal(zo.length, 1);
assert.equal(zo[0].price, 6.49);
assert.equal(offersForZone([O(1, "IGA", "Lait 2 % 4 L", 4.99, { zone_slug: "quebec" })], "montreal").length, 0);

// quantités
const q = buildPlans([I("lait", 3)], [O(1, "IGA", "Lait 2 % 4 L", 5)], opt);
assert.equal(q.plans[0].total, 15);

// lien
assert.equal(mapsLink(null, "voiture", ["IGA"]), null);
assert(mapsLink("H2X 1A1", "transport", ["IGA", "Metro"])!.includes("travelmode=transit"));
console.log("courses (moteur) : OK");
