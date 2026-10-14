import Link from "next/link";
import PromoCard from "@/components/PromoCard";
import { getUser } from "@/lib/auth";
import { getFacets, hasDemoData, PAGE_SIZE, searchPromotions } from "@/lib/promotions";
import { CATEGORY_GROUPS } from "@/lib/categories";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Aubaines QC — toutes les promotions du Québec au même endroit" } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = {
    q: one(sp.q)?.trim() || undefined,
    categorie: one(sp.categorie),
    etablissement: one(sp.etablissement),
    tri: one(sp.tri) ?? "rabais",
    page: Number(one(sp.page) ?? 1) || 1,
  };

  const user = await getUser();
  const [{ rows, total, page }, facets, demo] = await Promise.all([
    searchPromotions(f, user?.id),
    getFacets(),
    hasDemoData(),
  ]);

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...f, ...over } as Record<string, string | number | undefined>;
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && !(k === "page" && v === 1) && !(k === "tri" && v === "rabais"))
        p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {one(sp.bienvenue) && <p className="flash">Bienvenue ! Un courriel de confirmation vous a été envoyé.</p>}
      {one(sp.verification) && <p className="flash">Nouveau lien de confirmation envoyé.</p>}
      {one(sp.motdepasse) && <p className="flash">Mot de passe modifié. Vous êtes connecté.</p>}
      {demo && (
        <div className="demo-banner">
          Mode démonstration : les promotions affichées sont fictives. Branchez vos sources
          réelles (voir le README) pour les remplacer.
        </div>
      )}

      <section className="hero">
        <h1>Toutes les promotions du Québec, au même endroit.</h1>
        <p>Épiceries, pharmacies, électronique, rénovation… triées par produit et par établissement.</p>
        <form action="/" className="search">
          <input name="q" defaultValue={f.q} placeholder="Rechercher un produit : poulet, couches, perceuse…" aria-label="Rechercher" />
          {f.categorie && <input type="hidden" name="categorie" value={f.categorie} />}
          {f.etablissement && <input type="hidden" name="etablissement" value={f.etablissement} />}
          <button className="btn btn-primary">Rechercher</button>
        </form>
      </section>

      <div className="layout">
        <aside className="filters">
          <h2>Établissements</h2>
          <ul>
            <li>
              <Link href={href({ etablissement: undefined, page: 1 })} className={!f.etablissement ? "active" : ""}>
                Tous
              </Link>
            </li>
            {facets.establishments.map((e) => (
              <li key={e.slug}>
                <Link href={href({ etablissement: e.slug, page: 1 })} className={f.etablissement === e.slug ? "active" : ""}>
                  {e.name} <small>{e.n}</small>
                </Link>
              </li>
            ))}
          </ul>

          <h2>Types de produits</h2>
          <ul>
            <li>
              <Link href={href({ categorie: undefined, page: 1 })} className={!f.categorie ? "active" : ""}>
                Tous
              </Link>
            </li>
          </ul>
          {CATEGORY_GROUPS.map((g) => {
            const cats = facets.categories.filter((c) => c.group_name === g && c.n > 0);
            if (!cats.length) return null;
            return (
              <div key={g}>
                <h3>{g}</h3>
                <ul>
                  {cats.map((c) => (
                    <li key={c.slug}>
                      <Link href={href({ categorie: c.slug, page: 1 })} className={f.categorie === c.slug ? "active" : ""}>
                        {c.name} <small>{c.n}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        <section>
          <div className="results-bar">
            <strong>{total.toLocaleString("fr-CA")} promotion{total > 1 ? "s" : ""}</strong>
            <div className="sort">
              Trier par :
              {[
                ["rabais", "Plus gros rabais"],
                ["prix", "Prix croissant"],
                ["fin", "Se termine bientôt"],
                ["recent", "Plus récentes"],
              ].map(([v, label]) => (
                <Link key={v} href={href({ tri: v, page: 1 })} className={f.tri === v ? "active" : ""}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="empty">Aucune promotion ne correspond à votre recherche.</p>
          ) : (
            <div className="grid">
              {rows.map((p) => (
                <PromoCard key={p.id} p={p} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="pager">
              {page > 1 && <Link href={href({ page: page - 1 })}>← Précédent</Link>}
              <span>Page {page} de {pages}</span>
              {page < pages && <Link href={href({ page: page + 1 })}>Suivant →</Link>}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
