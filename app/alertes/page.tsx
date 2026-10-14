import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import AlertForm from "@/components/AlertForm";
import { createAlert, deleteAlert } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes alertes — Aubaines QC", robots: { index: false } };

export default async function Page() {
  const user = await requireUser();
  const [alerts, categories, establishments, [flags]] = await Promise.all([
    query<any>(
      `SELECT a.id, a.keyword, a.min_discount, c.name AS category, e.name AS establishment
       FROM alerts a LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN establishments e ON e.id = a.establishment_id
       WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [user.id]),
    query<{ id: number; name: string }>("SELECT id, name FROM categories ORDER BY sort"),
    query<{ id: number; name: string }>("SELECT id, name FROM establishments ORDER BY name"),
    query<{ alerts_opt_out: boolean }>("SELECT alerts_opt_out FROM users WHERE id = $1", [user.id]),
  ]);

  return (
    <div className="wide-page">
      <h1 className="page-title">Mes alertes</h1>
      <p className="auth-lead">Recevez un courriel quand de nouvelles offres correspondent à ce que vous cherchez, et un rappel quand vos favoris se terminent.</p>
      {!user.verified && <p className="notice">Confirmez votre courriel pour activer les alertes.</p>}
      {flags?.alerts_opt_out && <p className="notice">Vous êtes désabonné des courriels. Créer une nouvelle alerte les réactive.</p>}

      <h2>Nouvelle alerte</h2>
      <AlertForm action={createAlert} categories={categories} establishments={establishments} />

      <h2>Mes alertes ({alerts.length})</h2>
      {alerts.length === 0 ? <p className="empty">Aucune alerte.</p> : (
        <table className="table"><tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{[a.keyword && `« ${a.keyword} »`, a.category, a.establishment, a.min_discount && `≥ ${a.min_discount} %`].filter(Boolean).join(" · ")}</td>
              <td className="actions"><form action={deleteAlert}><input type="hidden" name="id" value={a.id} />
                <button className="linklike danger">Supprimer</button></form></td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}
