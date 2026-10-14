import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { approveMerchant, deletePromotion, rejectMerchant } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Aubaines QC", robots: { index: false } };

const KINDS: [string, string][] = [
  ["epicerie", "Épicerie"], ["pharmacie", "Pharmacie"], ["electronique", "Électronique"],
  ["maison", "Maison"], ["renovation", "Rénovation"], ["magasin", "Magasin général"],
  ["restaurant", "Restaurant"], ["autre", "Autre"],
];

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;

  const [stats] = await query<Record<string, number>>(`
    SELECT (SELECT count(*) FROM users)::int AS users,
           (SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL)::int AS verified,
           (SELECT count(*) FROM promotions WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE)::int AS active,
           (SELECT count(*) FROM promotions WHERE source='merchant')::int AS merchant_promos,
           (SELECT count(*) FROM merchant_profiles WHERE status='approved')::int AS merchants,
           (SELECT count(*) FROM alerts)::int AS alerts,
           (SELECT count(*) FROM favorites)::int AS favorites`);

  const pending = await query<any>(
    `SELECT m.user_id, m.business_name, m.website, m.phone, m.message, u.email, u.name
     FROM merchant_profiles m JOIN users u ON u.id = m.user_id
     WHERE m.status = 'pending' ORDER BY m.created_at`);
  const establishments = await query<{ id: number; name: string }>("SELECT id, name FROM establishments ORDER BY name");
  const recent = await query<any>(
    `SELECT p.id, p.title, e.name AS est, p.source FROM promotions p JOIN establishments e ON e.id = p.establishment_id
     WHERE p.source = 'merchant' ORDER BY p.created_at DESC LIMIT 20`);

  return (
    <div className="wide-page">
      <h1 className="page-title">Administration</h1>
      {sp.ok && <p className="form-ok">Action effectuée ✓</p>}

      <div className="stats">
        {[
          ["Utilisateurs", stats.users], ["Courriels vérifiés", stats.verified], ["Promotions actives", stats.active],
          ["Commerçants", stats.merchants], ["Offres commerçants", stats.merchant_promos],
          ["Alertes", stats.alerts], ["Favoris", stats.favorites],
        ].map(([k, v]) => (
          <div key={String(k)} className="stat"><strong>{Number(v).toLocaleString("fr-CA")}</strong><span>{k}</span></div>
        ))}
      </div>

      <h2>Demandes commerçant ({pending.length})</h2>
      {pending.length === 0 && <p className="empty">Aucune demande en attente.</p>}
      {pending.map((m) => (
        <div key={m.user_id} className="panel">
          <p><strong>{m.business_name}</strong> — <a href={m.website} target="_blank" rel="noopener noreferrer nofollow">{m.website}</a></p>
          <p className="muted">{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
          {m.message && <p>{m.message}</p>}
          <form action={approveMerchant} className="inline-form">
            <input type="hidden" name="userId" value={m.user_id} />
            <label>Lier à un commerce existant
              <select name="establishmentId" defaultValue="">
                <option value="">— Créer un nouveau commerce —</option>
                {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label>Nom affiché (si nouveau)<input name="name" defaultValue={m.business_name} /></label>
            <label>Type
              <select name="kind" defaultValue="autre">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <button className="btn btn-primary btn-sm">Approuver</button>
          </form>
          <form action={rejectMerchant}>
            <input type="hidden" name="userId" value={m.user_id} />
            <button className="linklike danger">Refuser</button>
          </form>
        </div>
      ))}

      <h2>Dernières offres de commerçants (modération)</h2>
      {recent.length === 0 ? <p className="empty">Aucune.</p> : (
        <table className="table"><tbody>
          {recent.map((p) => (
            <tr key={p.id}><td>{p.title}</td><td>{p.est}</td>
              <td className="actions"><form action={deletePromotion}><input type="hidden" name="id" value={p.id} />
                <button className="linklike danger">Supprimer</button></form></td></tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}
