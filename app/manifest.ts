import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aubaines QC",
    short_name: "Aubaines",
    description: "Toutes les promotions du Québec au même endroit.",
    lang: "fr-CA",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#d9381e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
