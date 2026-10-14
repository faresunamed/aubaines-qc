import assert from "node:assert/strict";
import { productIcon } from "../lib/product-icons";

const cases: [string, string, string][] = [
  ["Poulet entier frais", "viandes-poissons", "🍗"],
  ["Pommes McIntosh sac de 3 lb", "fruits-legumes", "🍎"],
  ["Pommes de terre blanches 10 lb", "fruits-legumes", "🥔"],
  ["Saumon atlantique filet", "viandes-poissons", "🐟"],
  ["Œufs gros calibre, douzaine", "produits-laitiers-oeufs", "🥚"],
  ["Oeufs gros calibre, douzaine", "produits-laitiers-oeufs", "🥚"],
  ["Fromage cheddar fort 400 g", "produits-laitiers-oeufs", "🧀"],
  ["Yogourt grec 650 g", "produits-laitiers-oeufs", "🥣"],
  ["Lait 2 % 4 L", "produits-laitiers-oeufs", "🥛"],
  ["Croustilles Lay's 235 g", "collations-confiseries", "🥔"],
  ["Pizza surgelée Delissio", "surgeles", "🍕"],
  ["Bière IPA 6 x 473 ml", "boissons", "🍺"],
  ["Café moulu 925 g", "garde-manger", "☕"],
  ["Couches Pampers format géant", "bebe", "👶"],
  ["Papier hygiénique Cashmere 24 rouleaux", "entretien-menager", "🧻"],
  ["Téléviseur Samsung 55 po 4K", "electronique", "📺"],
  ["Perceuse sans fil 20 V", "quincaillerie-renovation", "🔧"],
  ["Tondeuse à gazon électrique", "jardin-exterieur", "🌱"],
  ["Pneus d'hiver Michelin", "auto", "🛞"],
  ["Ensemble LEGO Star Wars", "jouets-jeux", "🧱"],
  ["Nourriture pour chien 12 kg", "animaux", "🐕"],
  ["Vitamine D 1000 UI", "pharmacie-sante", "💊"],
  ["Shampooing Pantene 750 ml", "beaute-soins", "🧴"],
  ["Manteau d'hiver pour homme", "vetements", "🧥"],
  // pas de faux positifs sur des sous-mots
  ["Tablette de rangement murale", "maison-cuisine", "🍳"],
  ["Chocolat noir 70 % 100 g", "collations-confiseries", "🍫"],
  ["Pâtes Barilla 900 g", "garde-manger", "🍝"],
  ["Bassin à eau de jardin", "jardin-exterieur", "💧"],
  // repli sur le type
  ["Article mystérieux", "garde-manger", "🥫"],
  ["", "autre", "🏷️"],
];
let bad = 0;
for (const [t, c, want] of cases) {
  const got = productIcon(t, c);
  if (got !== want) { bad++; console.log(`FAIL « ${t} » → ${got} (attendu ${want})`); }
}
console.log(bad ? `${bad} échec(s)` : `icônes : ${cases.length} cas OK`);
process.exit(bad ? 1 : 0);
