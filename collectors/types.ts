export type EstablishmentInfo = {
  slug: string;
  name: string;
  kind: string;
  website?: string;
  color?: string;
};

export type RawPromotion = {
  externalId: string;
  title: string;
  brand?: string;
  description?: string;
  price?: number;
  regularPrice?: number;
  discountPercent?: number;
  unit?: string;
  imageUrl?: string;
  sourceUrl?: string;
  validFrom?: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD
  /** Catégorie par défaut du commerce si le classificateur ne trouve rien. */
  categoryHint?: string;
};

export interface Collector {
  id: string;
  establishment: EstablishmentInfo;
  /** true si les données sont fictives (affiche un bandeau « démo » sur le site). */
  demo?: boolean;
  fetch(): Promise<RawPromotion[]>;
}
