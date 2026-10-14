import { unsubscribe } from "../alertes/actions";

export const metadata = { title: "Désabonnement — Aubaines QC", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; ok?: string }> }) {
  const { token } = await searchParams;
  async function confirm(form: FormData) {
    "use server";
    await unsubscribe(form);
    const { redirect } = await import("next/navigation");
    redirect("/desabonnement?ok=1");
  }
  const { ok } = await searchParams;
  if (ok) {
    return <div className="auth"><h1>Désabonné ✓</h1><p className="auth-lead">Vous ne recevrez plus de courriels d'alertes.</p></div>;
  }
  return (
    <div className="auth">
      <h1>Se désabonner</h1>
      <p className="auth-lead">Confirmez pour ne plus recevoir de courriels d'alertes et de rappels.</p>
      <form action={confirm}>
        <input type="hidden" name="token" value={token ?? ""} />
        <button className="btn btn-primary">Me désabonner</button>
      </form>
    </div>
  );
}
