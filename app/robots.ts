import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/commercant/offres", "/commercant/import", "/alertes", "/favoris", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
