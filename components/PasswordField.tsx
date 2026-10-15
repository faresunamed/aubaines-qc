"use client";

import { useState } from "react";

/** Champ mot de passe avec bouton œil pour afficher / masquer la saisie. */
export default function PasswordField({
  label, name, autoComplete, minLength,
}: { label: string; name: string; autoComplete: string; minLength?: number }) {
  const [shown, setShown] = useState(false);
  return (
    <label>
      {label}
      <span className="pw">
        <input name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required
          autoCapitalize="none" spellCheck={false} />
        <button type="button" className="pw-eye" onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={shown} title={shown ? "Masquer" : "Afficher"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {shown && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </span>
    </label>
  );
}
