import { redirect } from "next/navigation";
import PromoCard from "@/components/PromoCard";
import { getUser } from "@/lib/auth";
import { getFavorites } from "@/lib/promotions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes favoris — Aubaines QC" };

export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/connexion");
  const rows = await getFavorites(user.id);
  return (
    <>
      <h1 className="page-title">Mes favoris</h1>
      {rows.length === 0 ? (
        <p className="empty">Aucun favori pour l'instant. Cliquez sur l'étoile d'une promotion pour l'ajouter.</p>
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <PromoCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
