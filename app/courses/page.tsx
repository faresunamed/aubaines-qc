import { requireUser } from "@/lib/auth";
import { MODES, buildPlans, type Plan } from "@/lib/shopping";
import { getItems, getPrefs, loadOffers, MAX_ITEMS } from "@/lib/shopping-db";
import { ZONES, zoneBySlug, zoneFromPostal } from "@/lib/zones";
import { addItem, clearList, removeItem, savePrefs } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma liste de courses — Aubaines QC", robots: { index: false } };

const $ = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;
const dur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`);
const ERRORS: Record<string, string> = {
  article: "Écrivez un article d'au moins 2 lettres.",
  limite: `Votre liste est pleine (${MAX_ITEMS} articles maximum).`,
  postal: "Code postal invalide. Exemple : H2X 1A1 (Québec seulement).",
};

function PlanCard({ plan, total, mode }: { plan: Plan; total: number; mode: string }) {
  const covered = total - plan.uncovered.length;
  return (
    <article className="plan">
      <header>
        <h3>{plan.labels.join(" · ")}</h3>
        <p className="plan-total">{$(plan.total)}<small> estimé</small></p>
      </header>
      <p className="plan-meta">
        <strong>{dur(plan.totalMin)}</strong> au total ({dur(plan.travelMin)} de trajet + {dur(plan.shopMin)} en magasin) · environ {plan.distanceKm.toLocaleString("fr-CA")} km · {plan.stops.length} arrêt{plan.stops.length > 1 ? "s" : ""}
      </p>
      <p className="plan-cover">{covered} article{covered > 1 ? "s" : ""} sur {total} avec un prix en circulaire{plan.savings > 0 ? ` · économie estimée ${$(plan.savings)}` : ""}</p>
      <ol className="plan-stops">
        {plan.stops.map((s) => (
          <li key={s.establishment_id}>
            <p className="stop-head"><strong>{s.name}</strong><span>{$(s.subtotal)}</span></p>
            <ul>
              {s.lines.map((l) => (
                <li key={l.item.id}>
                  <span>{l.item.qty > 1 ? `${l.item.qty} × ` : ""}{l.offer.title}</span>
                  <span>{$(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {plan.uncovered.length > 0 && (
        <p className="plan-miss">Sans prix dans ce plan : {plan.uncovered.map((u) => u.text).join(", ")}.</p>
      )}
      {plan.mapsUrl && (
        <p>
          <a className="btn btn-primary btn-sm" href={plan.mapsUrl} target="_blank" rel="noopener noreferrer">Ouvrir l'itinéraire dans Google Maps</a>
        </p>
      )}
      {mode === "transport" && <p className="muted small">Google Maps ignore les étapes intermédiaires en transport en commun : ajoutez-les une à une.</p>}
    </article>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [prefs, items] = await Promise.all([getPrefs(user.id), getItems(user.id)]);
  const zone = prefs.zone_slug ?? zoneFromPostal(prefs.postal_code);
  const ready = !!prefs.postal_code;

  let plans: Plan[] = [];
  let unmatched = items.slice(0, 0);
  if (ready && items.length) {
    const offers = await loadOffers(zone);
    ({ plans, unmatched } = buildPlans(items, offers, {
      zone, mode: prefs.mode, maxStops: prefs.max_stops, multiStore: prefs.multi_store, postal: prefs.postal_code,
    }));
  }

  return (
    <div className="courses">
      <h1 className="page-title">Ma liste de courses</h1>
      <p className="auth-lead">Ajoutez vos articles : nous comparons les circulaires près de chez vous et proposons les trajets les plus avantageux, avec prix et durée estimés.</p>
      {sp.erreur && <p className="form-error">{ERRORS[sp.erreur] ?? "Une erreur est survenue."}</p>}

      <div className="courses-grid">
        <section className="panel">
          <h2>Mes articles ({items.length})</h2>
          <form action={addItem} className="add-row">
            <input name="text" placeholder="Ex. poulet, lait 2 %, couches" maxLength={80} required aria-label="Article" />
            <input name="qty" type="number" min={1} max={99} defaultValue={1} aria-label="Quantité" className="qty" />
            <button className="btn btn-primary btn-sm">Ajouter</button>
          </form>
          {items.length === 0 ? (
            <p className="empty">Votre liste est vide. Tapez un article ci-dessus ou cliquez sur « + Liste » sur une promotion.</p>
          ) : (
            <ul className="items">
              {items.map((it) => (
                <li key={it.id}>
                  <span>{it.qty > 1 ? `${it.qty} × ` : ""}{it.text}</span>
                  <form action={removeItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <button className="linklike danger" aria-label={`Retirer ${it.text}`}>Retirer</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <form action={clearList}><button className="linklike danger">Vider la liste</button></form>
          )}
        </section>

        <section className="panel">
          <h2>Mon trajet</h2>
          <form action={savePrefs} className="auth-form prefs">
            <label>Code postal (Québec)
              <input name="postal" defaultValue={prefs.postal_code ?? ""} placeholder="H2X 1A1" autoComplete="postal-code" maxLength={8} />
            </label>
            <label>Zone de prix
              <select name="zone" defaultValue={zone === zoneFromPostal(prefs.postal_code) ? "auto" : zone}>
                <option value="auto">Automatique ({zoneBySlug(zoneFromPostal(prefs.postal_code))?.name})</option>
                {ZONES.map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}
              </select>
              <small>Déduite de votre code postal ; choisissez-en une autre au besoin.</small>
            </label>
            <label>Déplacement
              <select name="mode" defaultValue={prefs.mode}>
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" name="multi" defaultChecked={prefs.multi_store} /> J'accepte de passer par plusieurs commerces</label>
            <label>Arrêts maximum
              <select name="max" defaultValue={String(prefs.max_stops)}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button className="btn btn-primary">Enregistrer et calculer</button>
          </form>
        </section>
      </div>

      <h2 className="plans-title">Mes itinéraires</h2>
      {!ready ? (
        <p className="notice">Entrez votre code postal ci-dessus pour voir les itinéraires de votre région ({zoneBySlug(zone)?.name}).</p>
      ) : items.length === 0 ? (
        <p className="empty">Ajoutez des articles pour voir les itinéraires.</p>
      ) : plans.length === 0 ? (
        <p className="notice">Aucune offre en circulaire ne correspond à vos articles pour l'instant. Essayez des mots plus simples (« lait », « pain »).</p>
      ) : (
        <>
          <div className="plans">
            {plans.map((p) => <PlanCard key={p.key} plan={p} total={items.length} mode={prefs.mode} />)}
          </div>
          {unmatched.length > 0 && (
            <p className="muted">Aucune offre trouvée pour : {unmatched.map((u) => u.text).join(", ")}.</p>
          )}
          <p className="muted small">
            Estimations : les prix viennent des offres en circulaire (les articles sans offre ne sont pas comptés), et les durées
            supposent des distances moyennes pour {zoneBySlug(zone)?.name}. Vérifiez toujours les prix en magasin.
          </p>
        </>
      )}
    </div>
  );
}
