// Parcourt tous les liens de filtres (établissements, catégories, puces, tri, pages) sur 2 niveaux
// et signale toute page qui affiche 0 promotion alors qu'un lien proposait des résultats.
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const seen = new Set<string>();
const bad: string[] = [];
const count = (html: string) => { const t = html.replace(/<!--.*?-->/g, ""); const m = /<strong>([0-9\s\u00a0\u202f]+)\s*promotion/.exec(t); return m ? Number(m[1].replace(/\D/g, "")) : NaN; };
const links = (html: string) => [...html.matchAll(/href="(\/\?[^"]*|\/)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
async function visit(path: string, depth: number) {
  if (seen.has(path) || seen.size > 400) return;
  seen.add(path);
  const html = await (await fetch(BASE + path)).text();
  const n = count(html);
  if (!(n > 0) && path !== "/") bad.push(`${path} → ${n}`);
  if (depth > 0) for (const l of links(html)) await visit(l, depth - 1);
}
await visit("/", 2);
console.log(`${seen.size} pages parcourues, ${bad.length} à 0`);
bad.slice(0, 15).forEach((b) => console.log("  0 résultat :", b));
process.exit(bad.length ? 1 : 0);
export {};
