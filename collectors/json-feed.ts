import type { Collector, EstablishmentInfo, RawPromotion } from "./types";

/**
 * Adaptateur générique pour toute source qui expose du JSON (API officielle,
 * flux partenaire, export commerçant). Décrivez la source dans collectors.config.json.
 *
 * Exemple de configuration : voir collectors.config.example.json
 */
export type JsonFeedConfig = {
  establishment: EstablishmentInfo;
  url: string;
  headers?: Record<string, string>;
  /** Chemin vers le tableau d'articles, ex. "data.items". Vide = la racine. */
  itemsPath?: string;
  /** Nom du champ source pour chaque champ de promotion. */
  fields: {
    id: string;
    title: string;
    brand?: string;
    description?: string;
    price?: string;
    regularPrice?: string;
    discountPercent?: string;
    unit?: string;
    imageUrl?: string;
    sourceUrl?: string;
    validFrom?: string;
    validTo?: string;
  };
};

function dig(obj: any, path?: string): any {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const num = (v: unknown) => {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};
const date = (v: unknown) => (v ? String(v).slice(0, 10) : undefined);

export function jsonFeedCollector(cfg: JsonFeedConfig): Collector {
  return {
    id: `feed-${cfg.establishment.slug}`,
    establishment: cfg.establishment,
    async fetch(): Promise<RawPromotion[]> {
      const res = await fetch(cfg.url, { headers: cfg.headers });
      if (!res.ok) throw new Error(`${cfg.url} → HTTP ${res.status}`);
      const items = dig(await res.json(), cfg.itemsPath);
      if (!Array.isArray(items)) throw new Error(`itemsPath "${cfg.itemsPath}" ne mène pas à un tableau`);
      const f = cfg.fields;
      return items
        .map((it: any): RawPromotion | null => {
          const title = dig(it, f.title);
          const id = dig(it, f.id);
          if (!title || id == null) return null;
          return {
            externalId: String(id),
            title: String(title),
            brand: f.brand ? dig(it, f.brand) : undefined,
            description: f.description ? dig(it, f.description) : undefined,
            price: num(f.price && dig(it, f.price)),
            regularPrice: num(f.regularPrice && dig(it, f.regularPrice)),
            discountPercent: num(f.discountPercent && dig(it, f.discountPercent)),
            unit: f.unit ? dig(it, f.unit) : undefined,
            imageUrl: f.imageUrl ? dig(it, f.imageUrl) : undefined,
            sourceUrl: f.sourceUrl ? dig(it, f.sourceUrl) : undefined,
            validFrom: date(f.validFrom && dig(it, f.validFrom)),
            validTo: date(f.validTo && dig(it, f.validTo)),
          };
        })
        .filter((x): x is RawPromotion => x !== null);
    },
  };
}
