import AuthForm from "@/components/AuthForm";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Mot de passe oublié — Aubaines QC", robots: { index: false } };

export default function Page() {
  return (
    <div className="auth">
      <h1>Mot de passe oublié</h1>
      <p className="auth-lead">Entrez votre courriel : nous vous enverrons un lien valide 1 heure.</p>
      <AuthForm action={requestPasswordReset} mode="forgot" />
    </div>
  );
}
