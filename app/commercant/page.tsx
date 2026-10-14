import Link from "next/link";
import { MerchantRequestForm } from "@/components/MerchantForms";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { requestMerchant, type MState } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Espace commerçant — Aubaines QC",
  description: "Publiez gratuitement les promotions de votre commerce et touchez des milliers de clients au Québec.",
};

export default async function Page() {
  const user = await getUser();
  const profile = user
    ? (await query<{ status: string; business_name: string }>(
        "SELECT status, business_name FROM merchant_profiles WHERE user_id = $1", [user.id]))[0]
    : undefined;

  return (
    <div className="auth wide-page">
      <h1>Espace commerçant</h1>
      <p className="auth-lead">
        Publiez vos promotions (une à une ou par fichier CSV) : elles sont classées automatiquement
        et visibles par tous les utilisateurs du site.
      </p>

      {!user && (
        <p>
          <Link className="btn btn-primary" href="/inscription">Créer un compte</Link>{" "}
          <Link className="btn" href="/connexion">Connexion</Link>
        </p>
      )}

      {user && !user.verified && (
        <p className="notice">Confirmez d'abord votre courriel avec le lien que nous vous avons envoyé, puis revenez ici.</p>
      )}

      {user?.verified && !profile && (
        <>
          <h2>Demander l'accès commerçant</h2>
          <MerchantRequestForm action={requestMerchant as (s: MState, f: FormData) => Promise<MState>} />
        </>
      )}

      {profile?.status === "pending" && (
        <p className="notice">Votre demande pour « {profile.business_name} » est en cours d'examen. Vous recevrez un courriel.</p>
      )}
      {profile?.status === "rejected" && (
        <p className="notice">Votre demande n'a pas été retenue. Écrivez-nous si vous pensez qu'il s'agit d'une erreur.</p>
      )}
      {profile?.status === "approved" && (
        <p>
          <Link className="btn btn-primary" href="/commercant/offres">Gérer mes offres</Link>{" "}
          <Link className="btn" href="/commercant/import">Importer un fichier CSV</Link>
        </p>
      )}
    </div>
  );
}
