import { normalize } from "./text";
import { zoneBySlug } from "./zones";

export type Offer = {
  id: number;
  title: string;
  brand: string | null;
  establishment_id: number;
  establishment_name: string;
  price: number;
  regular_price: number | null;
  unit: string | null;
  valid_to: string | null;
  zone_slug: string | null;
};
export type ListItem = { id: number; text: string; qty: number; promotion_id: number | null };
export type Mode = "voiture" | "transport" | "velo" | "marche";
export const MODES: { value: Mode; label: string; gmaps: string; kmh: number; overheadMin: number }[] = [
  { value: "voiture", label: "En auto", gmaps: "driving", kmh: 28, overheadMin: 5 },
  { value: "transport", label: "En transport en commun", gmaps: "transit", kmh: 17, overheadMin: 8 },
  { value: "velo", label: "À vélo", gmaps: "bicycling", kmh: 14, overheadMin: 2 },
  { value: "marche", label: "À pied", gmaps: "walking", kmh: 4.8, overheadMin: 0 },
];
export const modeInfo = (m: string) => MODES.find((x) => x.value === m) ?? MODES[0];

const STOP = new Set(["de", "du", "des", "la", "le", "les", "et", "un", "une", "au", "aux", "pour", "d", "l", "en", "a", "sans", "avec"]);

/** Mots significatifs d'un article saisi : sans accents, sans mots vides, sans pluriel simple. */
export function itemTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
}

/**
 * Garde, pour la zone donnée, la variante propre à la zone quand elle existe, sinon l'offre
 * valable partout ; écarte les offres d'une autre zone.
 */
export function offersForZone(offers: Offer[], zone: string): Offer[] {
  const best = new Map<string, Offer>();
  for (const o of offers) {
    if (o.zone_slug && o.zone_slug !== zone) continue;
    const key = `${o.establishment_id}|${normalize(o.title)}`;
    const cur = best.get(key);
    if (!cur || (o.zone_slug && !cur.zone_slug)) best.set(key, o);
  }
  return [...best.values()];
}

/** Offre la moins chère de chaque commerce pour un article. */
export function matchItem(item: ListItem, offers: Offer[]): Map<number, Offer> {
  const out = new Map<number, Offer>();
  const consider = (o: Offer) => {
    const cur = out.get(o.establishment_id);
    if (!cur || o.price < cur.price) out.set(o.establishment_id, o);
  };
  if (item.promotion_id != null) {
    const chosen = offers.find((o) => o.id === item.promotion_id);
    if (chosen) {
      // Même produit chez d'autres commerces : mêmes mots que l'offre choisie
      const tokens = itemTokens(chosen.title);
      for (const o of offers) {
        const hay = normalize(`${o.title} ${o.brand ?? ""}`);
        if (o.id === chosen.id || (tokens.length > 0 && tokens.every((t) => hay.includes(t)))) consider(o);
      }
    }
    return out;
  }
  const tokens = itemTokens(item.text);
  if (tokens.length === 0) return out;
  for (const o of offers) {
    const hay = normalize(`${o.title} ${o.brand ?? ""}`);
    if (tokens.every((t) => hay.includes(t))) consider(o);
  }
  return out;
}

export type Line = { item: ListItem; offer: Offer; lineTotal: number };
export type Stop = { establishment_id: number; name: string; lines: Line[]; subtotal: number };
export type Plan = {
  key: string;
  labels: string[];
  stops: Stop[];
  uncovered: ListItem[];
  total: number;
  regularTotal: number;
  savings: number;
  travelMin: number;
  shopMin: number;
  totalMin: number;
  distanceKm: number;
  mapsUrl: string | null;
};

export const SHOP_BASE_MIN = 8;
export const SHOP_PER_ITEM_MIN = 1.5;
export const TIME_VALUE_PER_HOUR = 18;
const ROAD_FACTOR = 1;

type Eval = { used: number[]; assign: Map<number, Line>; uncovered: ListItem[]; cost: number; travelMin: number; shopMin: number; km: number; regular: number };

function evaluate(subset: number[], items: ListItem[], matches: Map<number, Map<number, Offer>>, zone: string, mode: string): Eval {
  const assign = new Map<number, Line>();
  const uncovered: ListItem[] = [];
  let cost = 0, regular = 0;
  for (const it of items) {
    const m = matches.get(it.id)!;
    let best: Offer | undefined;
    for (const e of subset) {
      const o = m.get(e);
      if (o && (!best || o.price < best.price)) best = o;
    }
    if (!best) { uncovered.push(it); continue; }
    const lineTotal = round2(best.price * it.qty);
    assign.set(it.id, { item: it, offer: best, lineTotal });
    cost += lineTotal;
    regular += (best.regular_price && best.regular_price > best.price ? best.regular_price : best.price) * it.qty;
  }
  const used = subset.filter((e) => [...assign.values()].some((l) => l.offer.establishment_id === e));
  const z = zoneBySlug(zone) ?? zoneBySlug("autre")!;
  const mi = modeInfo(mode);
  const n = used.length;
  const km = n === 0 ? 0 : (2 * z.legKm + (n - 1) * z.betweenKm) * ROAD_FACTOR;
  const travelMin = n === 0 ? 0 : (km / mi.kmh) * 60 + n * mi.overheadMin;
  let shopMin = 0;
  for (const e of used) {
    const count = [...assign.values()].filter((l) => l.offer.establishment_id === e).length;
    shopMin += SHOP_BASE_MIN + SHOP_PER_ITEM_MIN * count;
  }
  return { used, assign, uncovered, cost: round2(cost), travelMin, shopMin, km, regular: round2(regular) };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function subsets<T>(arr: T[], maxSize: number): T[][] {
  const res: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length) res.push([...cur]);
    if (cur.length === maxSize) return;
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return res;
}

export function mapsLink(postal: string | null, mode: string, stopNames: string[]): string | null {
  if (!postal || stopNames.length === 0) return null;
  const q = (s: string) => encodeURIComponent(s);
  const place = `${postal}, Québec`;
  const wp = stopNames.slice(0, -1).map((n) => `${n} ${postal}`);
  const dest = `${stopNames[stopNames.length - 1]} ${postal}`;
  // Aller : maison → commerces ; le retour se fait depuis la dernière étape.
  let url = `https://www.google.com/maps/dir/?api=1&origin=${q(place)}&destination=${q(dest)}&travelmode=${modeInfo(mode).gmaps}`;
  if (wp.length) url += `&waypoints=${q(wp.join("|"))}`;
  return url;
}

export type PlanOptions = { zone: string; mode: string; maxStops: number; multiStore: boolean; postal: string | null };

/** Construit jusqu'à quatre plans comparés. Les offres doivent déjà être filtrées par zone. */
export function buildPlans(items: ListItem[], offers: Offer[], opt: PlanOptions): { plans: Plan[]; unmatched: ListItem[] } {
  const matches = new Map<number, Map<number, Offer>>();
  for (const it of items) matches.set(it.id, matchItem(it, offers));
  const unmatched = items.filter((it) => matches.get(it.id)!.size === 0);
  if (items.length === unmatched.length) return { plans: [], unmatched };

  // Commerces candidats : les 8 qui couvrent le plus d'articles (à égalité, le moins cher).
  const stat = new Map<number, { name: string; n: number; cost: number }>();
  for (const it of items) for (const [e, o] of matches.get(it.id)!) {
    const s = stat.get(e) ?? { name: o.establishment_name, n: 0, cost: 0 };
    s.n++; s.cost += o.price * it.qty; stat.set(e, s);
  }
  const cands = [...stat.entries()].sort((a, b) => b[1].n - a[1].n || a[1].cost - b[1].cost).slice(0, 8).map(([e]) => e);
  const maxStops = opt.multiStore ? Math.min(Math.max(opt.maxStops, 1), 4) : 1;

  const evals = subsets(cands, maxStops).map((s) => evaluate(s, items, matches, opt.zone, opt.mode));
  const dedup = new Map<string, Eval>();
  for (const ev of evals) {
    const k = [...ev.used].sort((a, b) => a - b).join(",");
    if (ev.used.length && !dedup.has(k)) dedup.set(k, ev);
  }
  const all = [...dedup.values()];
  const covered = (e: Eval) => items.length - e.uncovered.length;
  const maxCovered = Math.max(...all.map(covered));
  const pool = all.filter((e) => covered(e) === maxCovered);
  const totalMin = (e: Eval) => e.travelMin + e.shopMin;
  const pick = (cmp: (a: Eval, b: Eval) => number, list = pool) => [...list].sort(cmp)[0];

  const chosen: { label: string; ev: Eval }[] = [];
  const singles = all.filter((e) => e.used.length === 1);
  if (singles.length) {
    const mc = Math.max(...singles.map(covered));
    chosen.push({ label: "Un seul magasin", ev: pick((a, b) => a.cost - b.cost, singles.filter((e) => covered(e) === mc)) });
  }
  if (opt.multiStore) {
    chosen.push({ label: "Le moins cher", ev: pick((a, b) => a.cost - b.cost || totalMin(a) - totalMin(b)) });
    chosen.push({ label: "Le plus rapide", ev: pick((a, b) => totalMin(a) - totalMin(b) || a.cost - b.cost) });
    chosen.push({
      label: "Équilibré",
      ev: pick((a, b) => a.cost + (totalMin(a) / 60) * TIME_VALUE_PER_HOUR - (b.cost + (totalMin(b) / 60) * TIME_VALUE_PER_HOUR)),
    });
  }

  // Fusionner les plans identiques (mêmes commerces) en un seul avec plusieurs étiquettes.
  const merged = new Map<string, { labels: string[]; ev: Eval }>();
  for (const c of chosen) {
    const k = [...c.ev.used].sort((a, b) => a - b).join(",");
    const m = merged.get(k);
    if (m) m.labels.push(c.label); else merged.set(k, { labels: [c.label], ev: c.ev });
  }

  const plans: Plan[] = [...merged.entries()].map(([key, { labels, ev }]) => {
    const stops: Stop[] = ev.used.map((e) => {
      const lines = [...ev.assign.values()].filter((l) => l.offer.establishment_id === e);
      return { establishment_id: e, name: lines[0].offer.establishment_name, lines, subtotal: round2(lines.reduce((s, l) => s + l.lineTotal, 0)) };
    }).sort((a, b) => b.lines.length - a.lines.length || b.subtotal - a.subtotal);
    return {
      key, labels, stops, uncovered: ev.uncovered, total: ev.cost, regularTotal: ev.regular,
      savings: round2(Math.max(0, ev.regular - ev.cost)),
      travelMin: Math.round(ev.travelMin), shopMin: Math.round(ev.shopMin), totalMin: Math.round(ev.travelMin + ev.shopMin),
      distanceKm: Math.round(ev.km * 10) / 10,
      mapsUrl: mapsLink(opt.postal, opt.mode, stops.map((s) => s.name)),
    };
  });
  return { plans, unmatched };
}
