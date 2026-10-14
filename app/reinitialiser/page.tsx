import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { peekToken } from "@/lib/tokens";
import { resetPassword } from "../actions";

export const metadata = { title: "Nouveau mot de passe — Aubaines QC", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token || !(await peekToken(token, "reset"))) {
    return (
      <div className="auth">
        <h1>Lien invalide ou expiré</h1>
        <Link className="btn btn-primary" href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
      </div>
    );
  }
  return (
    <div className="auth">
      <h1>Nouveau mot de passe</h1>
      <AuthForm action={resetPassword} mode="reset" token={token} />
    </div>
  );
}
