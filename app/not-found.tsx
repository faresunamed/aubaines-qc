import Link from "next/link";

export const metadata = { title: "Page introuvable — Aubaines QC", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="lost">
      <p className="big">404</p>
      <h1>Cette page est introuvable</h1>
      <p>Le lien est peut-être périmé, ou l'offre a pris fin. Retournez voir les promotions du moment.</p>
      <Link href="/" className="btn btn-primary">Voir les promotions</Link>
    </div>
  );
}
