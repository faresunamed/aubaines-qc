import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ests, cats] = await Promise.all([
    query<{ slug: string }>("SELECT slug FROM establishments"),
    query<{ slug: string }>("SELECT slug FROM categories WHERE slug <> 'autre'"),
  ]);
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/commercant`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/conditions`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    ...ests.map((e) => ({ url: `${SITE_URL}/etablissement/${e.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...cats.map((c) => ({ url: `${SITE_URL}/categorie/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
