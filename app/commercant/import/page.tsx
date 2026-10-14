import Link from "next/link";
import { CsvImportForm } from "@/components/MerchantForms";
import { requireMerchant } from "@/lib/auth";
import { importCsv } from "../actions";

export const metadata = { title: "Importer des offres — Aubaines QC", robots: { index: false } };

export default async function Page() {
  await requireMerchant();
  return (
    <div className="wide-page">
      <p><Link href="/commercant/offres">← Mes offres</Link></p>
      <h1 className="page-title">Importer des offres (CSV)</h1>
      <p>
        Colonnes : <code>titre</code> et <code>prix</code> (obligatoires), puis <code>prix_regulier</code>, <code>unite</code>,{" "}
        <code>debut</code>, <code>fin</code> (AAAA-MM-JJ), <code>url</code>, <code>description</code>, <code>categorie</code>.
        Séparateur virgule ou point-virgule ; prix avec virgule ou point. 500 lignes maximum.
        Réimporter le même produit avec la même date de début met l'offre à jour au lieu de la dupliquer.
      </p>
      <p><a className="btn" href="/modele-offres.csv" download>Télécharger le modèle</a></p>
      <CsvImportForm action={importCsv} />
    </div>
  );
}
