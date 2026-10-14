import { toggleFavorite } from "@/app/actions";
import type { Promo } from "@/lib/promotions";

const money = (v: string | null) =>
  v == null
    ? null
    : new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(Number(v));

function endLabel(validTo: string | null) {
  if (!validTo) return null;
  const end = new Date(validTo + "T23:59:59");
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Se termine aujourd'hui";
  if (days === 1) return "Se termine demain";
  if (days <= 7) return `Se termine dans ${days} jours`;
  return `Jusqu'au ${end.toLocaleDateString("fr-CA", { day: "numeric", month: "long" })}`;
}

export default function PromoCard({ p }: { p: Promo }) {
  const fav = toggleFavorite.bind(null, p.id);
  const end = endLabel(p.valid_to);
  return (
    <article className="card">
      <div className="card-top">
        <span className="chip" style={{ ["--c" as string]: p.establishment_color }}>
          {p.establishment_name}
        </span>
        {p.discount_percent ? <span className="badge">−{p.discount_percent} %</span> : null}
      </div>
      <h3 className="card-title">{p.title}</h3>
      <p className="card-cat">{p.category_name}</p>
      <div className="card-price">
        {p.price != null && (
          <span className="price">
            {money(p.price)}
            {p.unit ? <small>{p.unit}</small> : null}
          </span>
        )}
        {p.regular_price != null && <s className="regular">{money(p.regular_price)}</s>}
      </div>
      <div className="card-foot">
        <span className="end">{end}</span>
        <form action={fav}>
          <button
            className={`fav ${p.is_favorite ? "on" : ""}`}
            aria-label={p.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={p.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {p.is_favorite ? "★" : "☆"}
          </button>
        </form>
      </div>
    </article>
  );
}
