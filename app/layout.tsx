import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { logout, resendVerification } from "./actions";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — toutes les promotions du Québec au même endroit`, template: "%s" },
  description:
    "Comparez les circulaires et promotions des épiceries, pharmacies et magasins du Québec. Recherchez par produit, catégorie ou établissement.",
  openGraph: { siteName: SITE_NAME, locale: "fr_CA", type: "website" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  applicationName: SITE_NAME,
};

export const viewport: Viewport = { themeColor: "#003da5", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="fr-CA">
      <body>
        <header className="site-header">
          <div className="wrap header-row">
            <Link href="/" className="logo">
              Aubaines<span>QC</span>
            </Link>
            <nav className="nav">
              <Link href="/">Promotions</Link>
              {user ? (
                <>
                  <Link href="/favoris">Favoris</Link>
                  <Link href="/alertes">Alertes</Link>
                  {(user.role === "merchant" || user.role === "admin") && <Link href="/commercant/offres">Mes offres</Link>}
                  {user.role === "admin" && <Link href="/admin">Admin</Link>}
                  <form action={logout}>
                    <button className="linklike">Déconnexion</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/commercant">Commerçants</Link>
                  <Link href="/connexion">Connexion</Link>
                  <Link href="/inscription" className="btn btn-primary btn-sm">
                    Créer un compte
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {user && !user.verified && (
          <div className="verify-banner">
            <div className="wrap">
              Confirmez votre courriel ({user.email}) pour activer les alertes.
              <form action={resendVerification}>
                <button className="linklike">Renvoyer le lien</button>
              </form>
            </div>
          </div>
        )}
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Les prix et dates proviennent des commerçants et peuvent changer. Vérifiez toujours en magasin ou sur le site du commerçant.
            </p>
            <p className="footer-links">
              <Link href="/commercant">Espace commerçant</Link>
              <Link href="/conditions">Conditions d'utilisation</Link>
              <Link href="/confidentialite">Confidentialité</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
