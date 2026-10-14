import type { Collector, EstablishmentInfo, RawPromotion } from "./types";

// Données FICTIVES pour tester le site. Aucun prix ci-dessous n'est réel.
export const DEMO_ESTABLISHMENTS: EstablishmentInfo[] = [
  { slug: "iga", name: "IGA", kind: "epicerie", website: "https://www.iga.net", color: "#d6342c" },
  { slug: "metro", name: "Metro", kind: "epicerie", website: "https://www.metro.ca", color: "#e0771e" },
  { slug: "maxi", name: "Maxi", kind: "epicerie", website: "https://www.maxi.ca", color: "#1f5fa8" },
  { slug: "super-c", name: "Super C", kind: "epicerie", website: "https://www.superc.ca", color: "#c8102e" },
  { slug: "jean-coutu", name: "Jean Coutu", kind: "pharmacie", website: "https://www.jeancoutu.com", color: "#0a7d5a" },
  { slug: "pharmaprix", name: "Pharmaprix", kind: "pharmacie", website: "https://www.pharmaprix.ca", color: "#cf2e8c" },
  { slug: "best-buy", name: "Best Buy", kind: "electronique", website: "https://www.bestbuy.ca", color: "#1b3d8f" },
  { slug: "canadian-tire", name: "Canadian Tire", kind: "maison", website: "https://www.canadiantire.ca", color: "#c8102e" },
  { slug: "rona", name: "RONA", kind: "renovation", website: "https://www.rona.ca", color: "#0c5ea7" },
  { slug: "walmart", name: "Walmart", kind: "magasin", website: "https://www.walmart.ca", color: "#0071ce" },
];

type Template = { title: string; regular: number; unit?: string };

const BY_KIND: Record<string, Template[]> = {
  epicerie: [
    { title: "Poulet entier frais", regular: 4.99, unit: "/lb" },
    { title: "Pommes McIntosh sac de 3 lb", regular: 5.99 },
    { title: "Fromage cheddar fort 400 g", regular: 7.49 },
    { title: "Pizza surgelée 4 fromages", regular: 6.99 },
    { title: "Pain tranché de blé entier", regular: 3.79 },
    { title: "Café moulu 920 g", regular: 14.99 },
    { title: "Croustilles 235 g", regular: 4.49 },
    { title: "Bière IPA 6 x 473 ml", regular: 13.99 },
    { title: "Saumon atlantique filet", regular: 13.99, unit: "/lb" },
    { title: "Yogourt grec 650 g", regular: 5.49 },
    { title: "Papier hygiénique 24 rouleaux", regular: 17.99 },
    { title: "Oeufs gros calibre, douzaine", regular: 4.99 },
  ],
  pharmacie: [
    { title: "Vitamine D 1000 UI, 180 capsules", regular: 16.99 },
    { title: "Shampooing 750 ml", regular: 9.99 },
    { title: "Dentifrice 120 ml", regular: 4.99 },
    { title: "Couches format géant", regular: 34.99 },
    { title: "Analgésique ibuprofène 200 mg, 144 comprimés", regular: 17.99 },
    { title: "Lotion hydratante pour le corps", regular: 11.99 },
    { title: "Déodorant 85 g", regular: 6.49 },
    { title: "Lingettes pour bébé, paquet de 3", regular: 12.99 },
  ],
  electronique: [
    { title: "Téléviseur 55 po 4K", regular: 649.99 },
    { title: "Écouteurs sans fil", regular: 179.99 },
    { title: "Ordinateur portable 15,6 po", regular: 799.99 },
    { title: "Aspirateur robot", regular: 399.99 },
    { title: "Barre de son avec caisson de basses", regular: 299.99 },
    { title: "Console de jeu, ensemble de base", regular: 549.99 },
  ],
  maison: [
    { title: "Mijoteuse 6 L", regular: 59.99 },
    { title: "Pneus d'hiver, ensemble de 4", regular: 599.99 },
    { title: "Tente 4 personnes", regular: 199.99 },
    { title: "Vélo de montagne adulte", regular: 449.99 },
    { title: "Barbecue au propane 4 brûleurs", regular: 499.99 },
    { title: "Ensemble de casseroles 10 pièces", regular: 129.99 },
  ],
  renovation: [
    { title: "Perceuse sans fil 20 V", regular: 129.99 },
    { title: "Peinture intérieure 3,78 L", regular: 49.99 },
    { title: "Souffleuse à neige électrique", regular: 349.99 },
    { title: "Ampoules DEL, paquet de 8", regular: 15.99 },
    { title: "Coffre à outils 120 pièces", regular: 99.99 },
    { title: "Sel de déglaçage 20 kg", regular: 11.99 },
  ],
  magasin: [
    { title: "Manteau d'hiver pour homme", regular: 89.99 },
    { title: "Bottes d'hiver pour femme", regular: 74.99 },
    { title: "Ensemble LEGO", regular: 59.99 },
    { title: "Nourriture pour chien 12 kg", regular: 39.99 },
    { title: "Litière pour chat 18 kg", regular: 21.99 },
    { title: "Couverture en peluche", regular: 24.99 },
    { title: "Détergent à lessive 4,43 L", regular: 17.99 },
    { title: "Chaudron et jouets pour bébé", regular: 19.99 },
  ],
};

function seeded(seedStr: string) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Cycle de circulaire typique au Québec : du jeudi au mercredi. */
function flyerWeek(now = new Date()) {
  const start = new Date(now);
  const back = (start.getDay() + 3) % 7; // jours depuis jeudi
  start.setDate(start.getDate() - back);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: fmt(start), to: fmt(end) };
}

export function demoCollectors(): Collector[] {
  const week = flyerWeek();
  return DEMO_ESTABLISHMENTS.map((est) => ({
    id: `demo-${est.slug}`,
    establishment: est,
    demo: true,
    async fetch(): Promise<RawPromotion[]> {
      const templates = BY_KIND[est.kind] ?? BY_KIND.magasin;
      return templates.map((t, i) => {
        const rnd = seeded(`${est.slug}:${t.title}`);
        const pct = [15, 20, 25, 30, 33, 40, 50][Math.floor(rnd() * 7)];
        const price = Math.round(t.regular * (1 - pct / 100) * 100 - 1) / 100;
        return {
          externalId: `${est.slug}-${i}-${week.from}`,
          title: t.title,
          price,
          regularPrice: t.regular,
          unit: t.unit,
          validFrom: week.from,
          validTo: week.to,
          sourceUrl: est.website,
        };
      });
    },
  }));
}
