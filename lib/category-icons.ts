/** Pictogramme par type de produit : remplace la photo quand il n'y en a pas. */
export const CATEGORY_ICONS: Record<string, string> = {
  "fruits-legumes": "🥬", "viandes-poissons": "🥩", "produits-laitiers-oeufs": "🥚", boulangerie: "🥖",
  "garde-manger": "🥫", surgeles: "🧊", boissons: "🥤", "collations-confiseries": "🍫",
  "pharmacie-sante": "💊", "beaute-soins": "🧴", bebe: "🍼", animaux: "🐾",
  "entretien-menager": "🧽", "maison-cuisine": "🍳", electronique: "📺", "quincaillerie-renovation": "🔨",
  "jardin-exterieur": "🌿", vetements: "🧥", "sports-plein-air": "⛺", "jouets-jeux": "🧩",
  auto: "🚗", autre: "🏷️",
};
export const iconFor = (slug: string) => CATEGORY_ICONS[slug] ?? "🏷️";
