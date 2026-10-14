import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing from "@/components/Landing";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { searchPromotions } from "@/lib/promotions";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const [c] = await query<{ slug: string; name: string }>("SELECT slug, name FROM categories WHERE slug = $1", [slug]);
  return c;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return {
    title: `${c.name} en promotion au Québec — ${SITE_NAME}`,
    description: `Comparez les promotions « ${c.name} » de tous les commerces du Québec cette semaine.`,
    alternates: { canonical: `/categorie/${c.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const user = await getUser();
  const { rows, total } = await searchPromotions({ categorie: c.slug, tri: "rabais" }, user?.id);
  return (
    <Landing
      title={`${c.name} en promotion`}
      intro={`Les ${total} meilleures offres « ${c.name} » au Québec, tous commerces confondus.`}
      rows={rows}
      total={total}
      crumbs={[{ href: `/categorie/${c.slug}`, label: c.name }]}
    />
  );
}
