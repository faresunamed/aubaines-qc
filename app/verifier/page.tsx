import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { verifyEmail } from "../actions";

export const metadata = { title: "Confirmer mon courriel — Aubaines QC", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const token = one(sp.token);

  if (one(sp.ok)) {
    return (
      <div className="auth">
        <h1>Courriel confirmé ✓</h1>
        <p className="auth-lead">Merci ! Vous pouvez maintenant créer des alertes.</p>
        <Link className="btn btn-primary" href="/alertes">Créer une alerte</Link>
      </div>
    );
  }
  if (token && (await peekToken(token, "verify"))) {
    return (
      <div className="auth">
        <h1>Confirmer mon courriel</h1>
        <p className="auth-lead">Un clic pour terminer.</p>
        {/* Bouton explicite : évite qu'un robot d'aperçu de courriel consomme le lien. */}
        <form action={verifyEmail}>
          <input type="hidden" name="token" value={token} />
          <button className="btn btn-primary">Confirmer mon courriel</button>
        </form>
      </div>
    );
  }
  return (
    <div className="auth">
      <h1>Lien invalide ou expiré</h1>
      <p className="auth-lead">Connectez-vous : un bandeau vous permettra de recevoir un nouveau lien.</p>
      <Link className="btn" href="/connexion">Connexion</Link>
    </div>
  );
}
