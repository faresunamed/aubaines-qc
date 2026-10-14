import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
import { login } from "../actions";

export const metadata = { title: "Connexion — Aubaines QC" };

export default async function Page() {
  if (await getUser()) redirect("/");
  return (
    <div className="auth">
      <h1>Connexion</h1>
      <AuthForm action={login} mode="login" />
      <p className="auth-alt">
        Pas encore de compte ? <Link href="/inscription">Créer un compte</Link>
      </p>
    </div>
  );
}
