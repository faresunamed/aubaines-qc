import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing from "@/components/Landing";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { searchPromotions } from "@/lib/promotions";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const [e] = await query<{ slug: string; name: string }>("SELECT slug, name FROM establishments WHERE slug = $1", [slug]);
  return e;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  if (!e) return {};
  return {
    title: `Promotions ${e.name} cette semaine — ${SITE_NAME}`,
    description: `Toutes les promotions et rabais de ${e.name} au Québec cette semaine : prix, rabais et dates de validité.`,
    alternates: { canonical: `/etablissement/${e.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  const user = await getUser();
  const { rows, total } = await searchPromotions({ etablissement: e.slug, tri: "rabais" }, user?.id);
  return (
    <Landing
      title={`Promotions ${e.name}`}
      intro={`Les ${total} offres actuellement en promotion chez ${e.name}, triées par plus gros rabais.`}
      rows={rows}
      total={total}
      crumbs={[{ href: `/etablissement/${e.slug}`, label: e.name }]}
    />
  );
}
