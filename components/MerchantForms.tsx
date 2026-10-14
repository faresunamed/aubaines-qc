"use client";

import { useActionState } from "react";
import type { MState } from "@/app/commercant/actions";

type Action = (s: MState, f: FormData) => Promise<MState>;
type Cat = { slug: string; name: string };

export type PromoDefaults = {
  id?: number;
  title?: string;
  price?: string | null;
  regular_price?: string | null;
  unit?: string | null;
  description?: string | null;
  source_url?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  category_slug?: string;
};

function Feedback({ state }: { state: MState }) {
  return (
    <>
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.message && <p className="form-ok" role="status">{state.message}</p>}
      {state?.errors && state.errors.length > 0 && (
        <ul className="err-list">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
    </>
  );
}

export function PromoForm({ action, categories, d = {}, label }: { action: Action; categories: Cat[]; d?: PromoDefaults; label: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="auth-form wide">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <label>Produit
        <input name="title" defaultValue={d.title} maxLength={140} required placeholder="Ex. Poulet entier frais 1,5 kg" />
      </label>
      <div className="row2">
        <label>Prix en promotion ($)
          <input name="price" inputMode="decimal" defaultValue={d.price ?? ""} required placeholder="3,99" />
        </label>
        <label>Prix régulier ($) <small>(optionnel)</small>
          <input name="regularPrice" inputMode="decimal" defaultValue={d.regular_price ?? ""} placeholder="5,99" />
        </label>
        <label>Unité <small>(optionnel)</small>
          <input name="unit" defaultValue={d.unit ?? ""} maxLength={20} placeholder="/lb, /kg, chacun" />
        </label>
      </div>
      <div className="row2">
        <label>Début
          <input name="validFrom" type="date" defaultValue={d.valid_from ?? ""} />
        </label>
        <label>Fin
          <input name="validTo" type="date" defaultValue={d.valid_to ?? ""} />
        </label>
        <label>Catégorie
          <select name="category" defaultValue={d.category_slug ?? ""}>
            <option value="">Automatique</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label>Lien vers l'offre <small>(optionnel)</small>
        <input name="sourceUrl" type="url" defaultValue={d.source_url ?? ""} placeholder="https://…" />
      </label>
      <label>Description <small>(optionnel)</small>
        <textarea name="description" rows={3} maxLength={1000} defaultValue={d.description ?? ""} />
      </label>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : label}</button>
    </form>
  );
}

export function MerchantRequestForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="auth-form">
      <label>Nom de l'entreprise<input name="business" required /></label>
      <label>Site web<input name="website" type="url" required placeholder="https://" /></label>
      <label>Téléphone <small>(optionnel)</small><input name="phone" /></label>
      <label>Message <small>(optionnel)</small>
        <textarea name="message" rows={3} placeholder="Combien de succursales ? Quels types de produits ?" />
      </label>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer ma demande"}</button>
    </form>
  );
}

export function CsvImportForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="auth-form wide">
      <label>Fichier CSV
        <input name="file" type="file" accept=".csv,text/csv" required />
      </label>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Import en cours…" : "Importer"}</button>
    </form>
  );
}
