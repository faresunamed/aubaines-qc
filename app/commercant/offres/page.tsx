import Link from "next/link";
import { PromoForm } from "@/components/MerchantForms";
import { requireMerchant } from "@/lib/auth";
import { query } from "@/lib/db";
import { createOffer, deleteOffer } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes offres — Aubaines QC", robots: { index: false } };

type Row = {
  id: number; title: string; price: string | null; regular_price: string | null;
  valid_from: string | null; valid_to: string | null; category_name: string; expired: boolean;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { establishmentId, businessName } = await requireMerchant();
  const sp = await searchParams;
  const [rows, categories] = await Promise.all([
    query<Row>(
      `SELECT p.id, p.title, p.price, p.regular_price, to_char(p.valid_from,'YYYY-MM-DD') AS valid_from,
              to_char(p.valid_to,'YYYY-MM-DD') AS valid_to, c.name AS category_name,
              (p.valid_to < CURRENT_DATE) AS expired
       FROM promotions p JOIN categories c ON c.id = p.category_id
       WHERE p.establishment_id = $1 AND p.source = 'merchant'
       ORDER BY p.valid_to DESC NULLS LAST, p.id DESC LIMIT 500`,
      [establishmentId],
    ),
    query<{ slug: string; name: string }>("SELECT slug, name FROM categories ORDER BY sort"),
  ]);

  return (
    <div className="wide-page">
      <h1 className="page-title">Mes offres — {businessName}</h1>
      {sp.ok && <p className="form-ok">Enregistré ✓</p>}
      <p><Link className="btn" href="/commercant/import">Importer un fichier CSV</Link></p>

      <h2>Nouvelle offre</h2>
      <PromoForm action={createOffer} categories={categories} label="Publier l'offre" />

      <h2>Offres publiées ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="empty">Aucune offre pour l'instant.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Produit</th><th>Prix</th><th>Valide</th><th>Catégorie</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.expired ? "expired" : ""}>
                <td>{r.title}{r.expired && <small> (expirée)</small>}</td>
                <td>{r.price ? `${Number(r.price).toFixed(2)} $` : "—"}{r.regular_price ? <s> {Number(r.regular_price).toFixed(2)} $</s> : null}</td>
                <td>{r.valid_from} → {r.valid_to}</td>
                <td>{r.category_name}</td>
                <td className="actions">
                  <Link href={`/commercant/offres/${r.id}`}>Modifier</Link>
                  <form action={deleteOffer}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="linklike danger">Supprimer</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
