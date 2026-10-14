"use client";

import { useActionState } from "react";
import type { AState } from "@/app/alertes/actions";

export default function AlertForm({
  action, categories, establishments,
}: {
  action: (s: AState, f: FormData) => Promise<AState>;
  categories: { id: number; name: string }[];
  establishments: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="auth-form wide">
      <label>Mot-clé <small>(optionnel)</small>
        <input name="keyword" maxLength={60} placeholder="Ex. couches, poulet, perceuse" />
      </label>
      <div className="row2">
        <label>Type de produit
          <select name="category" defaultValue="">
            <option value="">Tous</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Établissement
          <select name="establishment" defaultValue="">
            <option value="">Tous</option>
            {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label>Rabais minimum (%)
          <input name="minDiscount" type="number" min={1} max={90} placeholder="Ex. 30" />
        </label>
      </div>
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.message && <p className="form-ok" role="status">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Création…" : "Créer l'alerte"}</button>
    </form>
  );
}
