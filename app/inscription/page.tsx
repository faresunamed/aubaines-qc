import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
import { register } from "../actions";

export const metadata = { title: "Créer un compte — Aubaines QC" };

export default async function Page() {
  if (await getUser()) redirect("/");
  return (
    <div className="auth">
      <h1>Créer un compte</h1>
      <p className="auth-lead">Sauvegardez vos aubaines favorites et retrouvez-les à tout moment.</p>
      <AuthForm action={register} mode="register" />
      <p className="auth-alt">
        Déjà inscrit ? <Link href="/connexion">Se connecter</Link>
      </p>
    </div>
  );
}
