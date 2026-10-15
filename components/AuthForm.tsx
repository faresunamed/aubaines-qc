"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import PasswordField from "./PasswordField";

type Mode = "login" | "register" | "forgot" | "reset";

const LABEL: Record<Mode, string> = {
  login: "Se connecter",
  register: "Créer mon compte",
  forgot: "Envoyer le lien",
  reset: "Enregistrer le mot de passe",
};

export default function AuthForm({
  action,
  mode,
  token,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  mode: Mode;
  token?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const needsPassword = mode !== "forgot";
  return (
    <form action={formAction} className="auth-form">
      {mode === "register" && (
        <label>
          Prénom
          <input name="name" autoComplete="given-name" required />
        </label>
      )}
      {mode !== "reset" && (
        <label>
          Courriel
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      {needsPassword && (
        <PasswordField
          label={mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" || mode === "reset" ? 8 : undefined}
        />
      )}
      {(mode === "register" || mode === "reset") && (
        <PasswordField label="Confirmer le mot de passe" name="password2" autoComplete="new-password" minLength={8} />
      )}
      {mode === "reset" && <input type="hidden" name="token" value={token} />}
      {mode === "register" && (
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>
            J'accepte les <Link href="/conditions" target="_blank">conditions d'utilisation</Link> et la{" "}
            <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.
          </span>
        </label>
      )}
      {mode === "login" && (
        <Link href="/mot-de-passe-oublie" className="auth-small">Mot de passe oublié ?</Link>
      )}
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.message && <p className="form-ok" role="status">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Un instant…" : LABEL[mode]}
      </button>
    </form>
  );
}
