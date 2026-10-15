// Tests des filtres de recherche (lib + pages HTTP). Lecture seule.
// Prérequis : base locale avec les données de démonstration (npm run db:seed), serveur sur BASE_URL.
import { closeDb, query } from "../lib/db";
import { PAGE_SIZE, getFacets, searchPromotions } from "../lib/promotions";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let ok = 0, bad = 0;
const check = (name: string, cond: boolean, detail = "") => {
  cond ? ok++ : bad++;
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${cond || !detail ? "" : `\n       → ${detail}`}`);
};

const facets = await getFacets();
const all = await searchPromotions({});
check("sans filtre : des résultats et un total cohérent", all.total > 0 && all.rows.length === Math.min(PAGE_SIZE, all.total), `${all.total}/${all.rows.length}`);

// Catégorie
const cat = facets.categories.find((c) => c.n > 0)!;
const byCat = await searchPromotions({ categorie: cat.slug });
check(`catégorie « ${cat.slug} » : tous les résultats de cette catégorie`, byCat.rows.length > 0 && byCat.rows.every((r) => r.category_slug === cat.slug));
check("catégorie : total = compteur de la facette", byCat.total === cat.n, `${byCat.total} vs ${cat.n}`);

// Établissement
const est = facets.establishments.find((e) => e.n > 0)!;
const word = cat.slug.split("-")[0]; // ex. « viandes » pour viandes-poissons
const byWord = await searchPromotions({ q: word });
check(`recherche « ${word} » : trouve aussi toute la catégorie`, byWord.rows.some((r) => r.category_slug === cat.slug), `${byWord.total}`);
const plural = await searchPromotions({ q: word.replace(/s$/, "") + "s" });
check("recherche au pluriel/singulier équivalente", plural.total >= byWord.total || word.length <= 3, `${plural.total} vs ${byWord.total}`);
// Navigation croisée : chaque lien proposé (compteur > 0) doit donner exactement ce compteur, jamais 0
{
  let bad = 0, tested = 0;
  for (const e of facets.establishments.filter((x) => x.n > 0).slice(0, 6)) {
    const fc = await getFacets({ etablissement: e.slug });
    for (const c of fc.categories.filter((x) => x.n > 0)) {
      tested++;
      const r = await searchPromotions({ etablissement: e.slug, categorie: c.slug });
      if (r.total !== c.n) bad++;
    }
  }
  for (const c of facets.categories.filter((x) => x.n > 0).slice(0, 6)) {
    const fe = await getFacets({ categorie: c.slug });
    for (const e of fe.establishments.filter((x) => x.n > 0)) {
      tested++;
      const r = await searchPromotions({ etablissement: e.slug, categorie: c.slug });
      if (r.total !== e.n) bad++;
    }
  }
  check("navigation croisée : les compteurs affichés = résultats (jamais 0)", tested > 0 && bad === 0, `${bad} écarts sur ${tested}`);
  const withQ = await getFacets({ q: word });
  const sum = withQ.categories.reduce((a, c) => a + c.n, 0);
  check("compteurs avec recherche : somme = total de la recherche", sum === (await searchPromotions({ q: word })).total, `${sum}`);
}
const byEst = await searchPromotions({ etablissement: est.slug });
check(`établissement « ${est.slug} » : tous les résultats de ce commerce`, byEst.rows.length > 0 && byEst.rows.every((r) => r.establishment_slug === est.slug));
check("établissement : total = compteur de la facette", byEst.total === est.n, `${byEst.total} vs ${est.n}`);

// Combinaison
const both = await searchPromotions({ categorie: cat.slug, etablissement: est.slug });
check("catégorie + établissement : intersection", both.rows.every((r) => r.category_slug === cat.slug && r.establishment_slug === est.slug) && both.total <= Math.min(byCat.total, byEst.total));

// Recherche texte : accents, casse, pluriel partiel, plusieurs mots
const q1 = await searchPromotions({ q: "POULET" });
check("recherche insensible à la casse", q1.total > 0 && q1.rows.every((r) => /poulet/i.test(r.title + (r.brand ?? ""))), JSON.stringify(q1.rows.map((r) => r.title)));
const q2 = await searchPromotions({ q: "oeufs" });
const q3 = await searchPromotions({ q: "œufs" });
check("« oeufs » et « œufs » donnent les mêmes résultats", q2.total === q3.total && q2.total > 0, `${q2.total} vs ${q3.total}`);
const q4 = await searchPromotions({ q: "pomme mcintosh" });
check("plusieurs mots : tous requis", q4.total > 0 && q4.rows.every((r) => /pomme/i.test(r.title) && /mcintosh/i.test(r.title)));
const q5 = await searchPromotions({ q: "zzzzintrouvable" });
check("recherche sans résultat : 0, pas d'erreur", q5.total === 0 && q5.rows.length === 0);
const inj = await searchPromotions({ q: "'; DROP TABLE promotions; --" }).catch((e) => e);
check("texte hostile (injection SQL) : sans effet", !(inj instanceof Error) && (await query("SELECT count(*)::int AS n FROM promotions"))[0].n > 0);
const pct = await searchPromotions({ q: "100%" }).catch((e) => e);
check("recherche avec % et _ : pas d'erreur", !(pct instanceof Error));
const q6 = await searchPromotions({ q: "poulet", categorie: "electronique" });
check("recherche + catégorie sans lien : 0", q6.total === 0);

// Tris
const rab = (await searchPromotions({ tri: "rabais" })).rows.map((r) => r.discount_percent ?? -1);
check("tri « rabais » : décroissant", rab.every((v, i) => i === 0 || rab[i - 1] >= v), rab.join());
const prix = (await searchPromotions({ tri: "prix" })).rows.map((r) => Number(r.price ?? 1e9));
check("tri « prix » : croissant", prix.every((v, i) => i === 0 || prix[i - 1] <= v), prix.join());
const fin = (await searchPromotions({ tri: "fin" })).rows.map((r) => r.valid_to ?? "9999");
check("tri « fin » : date croissante", fin.every((v, i) => i === 0 || fin[i - 1] <= v), fin.join());
const inconnu = await searchPromotions({ tri: "n'importe quoi; DROP" }).catch((e) => e);
check("tri inconnu : repli sur le tri par défaut", !(inconnu instanceof Error) && inconnu.rows.length > 0);

// Pagination
if (all.total > PAGE_SIZE) {
  const p1 = await searchPromotions({ page: 1 }), p2 = await searchPromotions({ page: 2 });
  const ids1 = new Set(p1.rows.map((r) => r.id));
  check("pagination : page 2 sans doublon avec la page 1", p2.rows.length > 0 && p2.rows.every((r) => !ids1.has(r.id)));
  const far = await searchPromotions({ page: 9999 });
  check("page hors limite : vide, sans erreur", far.rows.length === 0);
}
const neg = await searchPromotions({ page: -3 }).catch((e) => e);
check("page négative : traitée comme la page 1", !(neg instanceof Error) && neg.rows.length > 0);

// Offres expirées / en attente invisibles
const exp = await query<{ n: number }>("SELECT count(*)::int AS n FROM promotions WHERE valid_to < CURRENT_DATE");
const [{ d: today }] = await query<{ d: string }>("SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d");
const listed = (await searchPromotions({})).rows.filter((r) => r.valid_to && r.valid_to < today);
check(`offres expirées (${exp[0].n}) jamais affichées`, listed.length === 0);

// Pages HTTP
const get = async (path: string) => { const r = await fetch(BASE + path); return { status: r.status, text: await r.text() }; };
const cards = (t: string) => (t.match(/<article class="card"/g) ?? []).length;
let r = await get(`/?categorie=${cat.slug}`);
check("page : filtre catégorie rend les cartes attendues", r.status === 200 && cards(r.text) === Math.min(byCat.total, PAGE_SIZE), `${r.status} ${cards(r.text)}`);
r = await get(`/?etablissement=${est.slug}&q=zzzzintrouvable`);
check("page : aucun résultat → message vide", r.status === 200 && r.text.includes("Aucune promotion"));
for (const bad of ["/?page=abc", "/?page=-1", "/?page=999999", "/?tri=zz", "/?categorie=%27%22%3Cscript%3E", "/?q=" + "a".repeat(2000), "/?categorie=a&categorie=b"]) {
  const x = await get(bad);
  check(`page : paramètre étrange ${bad.slice(0, 40)} → pas d'erreur serveur`, x.status < 500, String(x.status));
}
r = await get("/?q=%3Cscript%3Ealert(1)%3C/script%3E");
check("page : le texte de recherche est échappé (pas de XSS)", !r.text.includes("<script>alert(1)"));
r = await get(`/categorie/${cat.slug}`);
check("page catégorie dédiée", r.status === 200 && cards(r.text) > 0);
r = await get(`/etablissement/${est.slug}`);
check("page établissement dédiée", r.status === 200 && cards(r.text) > 0);

await closeDb();
console.log(`\n${ok} réussis, ${bad} échoués`);
process.exit(bad ? 1 : 0);
