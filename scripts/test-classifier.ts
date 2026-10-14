import { classify } from "../lib/classifier";

const cases: [string, string][] = [
  ["Poulet entier frais", "viandes-poissons"],
  ["Pommes McIntosh sac de 3 lb", "fruits-legumes"],
  ["Fromage cheddar fort 400 g", "produits-laitiers-oeufs"],
  ["Pizza surgelée Delissio", "surgeles"],
  ["Couches Pampers format géant", "bebe"],
  ["Papier hygiénique Cashmere 24 rouleaux", "entretien-menager"],
  ["Shampooing Pantene 750 ml", "beaute-soins"],
  ["Vitamine D 1000 UI", "pharmacie-sante"],
  ["Téléviseur Samsung 55 po 4K", "electronique"],
  ["Perceuse sans fil 20 V", "quincaillerie-renovation"],
  ["Tondeuse à gazon électrique", "jardin-exterieur"],
  ["Manteau d'hiver pour homme", "vetements"],
  ["Bière IPA 6 x 473 ml", "boissons"],
  ["Croustilles Lay's 235 g", "collations-confiseries"],
  ["Nourriture pour chien 12 kg", "animaux"],
  ["Pneus d'hiver Michelin", "auto"],
  ["Ensemble LEGO Star Wars", "jouets-jeux"],
  ["Tente 4 personnes", "sports-plein-air"],
  ["Mijoteuse 6 L", "maison-cuisine"],
  ["Pain tranché de blé entier", "boulangerie"],
  ["Café moulu Maxwell House", "garde-manger"],
  ["Chose mystérieuse", "autre"],
];

let fail = 0;
for (const [title, expected] of cases) {
  const got = classify(title).slug;
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? "OK  " : "FAIL"} ${title}  →  ${got}${ok ? "" : `  (attendu ${expected})`}`);
}
console.log(`\n${cases.length - fail}/${cases.length} réussis`);
process.exit(fail ? 1 : 0);
