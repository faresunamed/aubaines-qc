import Link from "next/link";
import { notFound } from "next/navigation";
import { PromoForm } from "@/components/MerchantForms";
import { requireMerchant } from "@/lib/auth";
import { query } from "@/lib/db";
import { updateOffer } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifier l'offre — Aubaines QC", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireMerchant();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [p] = await query<any>(
    `SELECT p.id, p.title, p.price, p.regular_price, p.unit, p.description, p.source_url,
            to_char(p.valid_from,'YYYY-MM-DD') AS valid_from, to_char(p.valid_to,'YYYY-MM-DD') AS valid_to,
            c.slug AS category_slug
     FROM promotions p JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1 AND p.establishment_id = $2 AND p.source = 'merchant'`,
    [id, establishmentId],
  );
  if (!p) notFound();
  const categories = await query<{ slug: string; name: string }>("SELECT slug, name FROM categories ORDER BY sort");

  return (
    <div className="wide-page">
      <p><Link href="/commercant/offres">← Mes offres</Link></p>
      <h1 className="page-title">Modifier l'offre</h1>
      <PromoForm action={updateOffer} categories={categories} d={p} label="Enregistrer" />
    </div>
  );
}
