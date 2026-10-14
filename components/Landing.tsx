import Link from "next/link";
import PromoCard from "@/components/PromoCard";
import type { Promo } from "@/lib/promotions";

export default function Landing({
  title, intro, rows, total, crumbs,
}: {
  title: string; intro: string; rows: Promo[]; total: number; crumbs: { href: string; label: string }[];
}) {
  return (
    <>
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        {crumbs.map((c) => (<span key={c.href}> / <Link href={c.href}>{c.label}</Link></span>))}
      </nav>
      <h1 className="page-title">{title}</h1>
      <p className="auth-lead">{intro}</p>
      {rows.length === 0 ? (
        <p className="empty">Aucune promotion active pour l'instant. Revenez bientôt ou <Link href="/alertes">créez une alerte</Link>.</p>
      ) : (
        <div className="grid">{rows.map((p) => <PromoCard key={p.id} p={p} />)}</div>
      )}
      {total > rows.length && (
        <p className="pager"><Link href="/">Voir toutes les promotions ({total})</Link></p>
      )}
    </>
  );
}
