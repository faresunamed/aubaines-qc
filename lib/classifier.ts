import { CATEGORIES } from "./categories";
import { normalize } from "./text";

type Matcher = { slug: string; test: (padded: string) => number; words: number };

// Pré-calcul : chaque mot-clé devient un test sur le texte normalisé entouré d'espaces.
const MATCHERS: Matcher[] = CATEGORIES.flatMap((cat) =>
  cat.keywords.map((raw): Matcher => {
    const prefix = raw.trim().endsWith("*");
    const kw = normalize(raw.replace(/\*$/, ""));
    const needle = prefix ? ` ${kw}` : ` ${kw} `;
    return {
      slug: cat.slug,
      words: kw.split(" ").length,
      test: (padded) => padded.indexOf(needle),
    };
  }),
);

export type Classification = { slug: string; score: number };

/**
 * Classe un produit selon son titre (et marque/description si fournies).
 * Les mots-clés plus longs (plus précis) pèsent plus lourd ; un mot qui apparaît
 * plus tôt dans le titre vaut un peu plus (le produit principal vient d'abord).
 * `hint` départage les égalités (ex. catégorie par défaut d'un commerce spécialisé).
 */
export function classify(
  title: string,
  extra: string = "",
  hint?: string,
): Classification {
  const padded = ` ${normalize(title)} `;
  const paddedExtra = extra ? ` ${normalize(extra)} ` : "";
  const scores = new Map<string, number>();

  for (const m of MATCHERS) {
    const pos = m.test(padded);
    if (pos >= 0) {
      const bonus = 1 - Math.min(pos, 60) / 120; // 1 → 0.5
      scores.set(m.slug, (scores.get(m.slug) ?? 0) + m.words * 2 + bonus);
    } else if (paddedExtra && m.test(paddedExtra) >= 0) {
      scores.set(m.slug, (scores.get(m.slug) ?? 0) + m.words * 0.5);
    }
  }

  let best: Classification = { slug: hint ?? "autre", score: 0 };
  for (const [slug, score] of scores) {
    if (
      score > best.score ||
      (score === best.score && slug === hint)
    ) {
      best = { slug, score };
    }
  }
  return best;
}
