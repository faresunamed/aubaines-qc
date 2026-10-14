# Aubaines QC

Agrégateur de promotions au Québec : recherche, filtres par **type de produit** et par **établissement**, comptes utilisateurs, favoris, alertes courriel, portail commerçant et console d'administration.

Stack : Next.js 15 (App Router) · Postgres · sessions JWT en cookie httpOnly · mots de passe bcrypt.

## Fonctionnalités

| Domaine | Détail |
|---|---|
| Consommateurs | Recherche, 21 types de produits, filtres par commerce, tris, favoris, alertes (mot-clé, catégorie, commerce, rabais minimum), rappel quand un favori se termine |
| Comptes | Inscription avec consentement, **confirmation du courriel**, **mot de passe oublié**, déconnexion de tous les appareils après réinitialisation, limitation des tentatives |
| Commerçants | Demande d'accès → approbation par un admin → publication/modification/suppression d'offres, **import CSV** (500 lignes), classification automatique |
| Administration | Statistiques, approbation/refus des commerçants, modération des offres |
| Croissance | Pages publiques par commerce et par catégorie, `sitemap.xml`, `robots.txt`, balises sociales, application installable (manifest + icônes) |
| Légal | Ébauches des conditions d'utilisation et de la politique de confidentialité (Loi 25) — **à faire valider** |

## Démarrer en local

```bash
npm install
cp .env.example .env.local         # puis changez AUTH_SECRET
npm run db:dev                     # Postgres local (port 5433) — avec un utilisateur non-root
npm run db:migrate                 # crée/met à jour les tables (idempotent)
npm run db:seed                    # 90 promotions FICTIVES de démonstration
npm run dev                        # http://localhost:3000
```

En développement, **aucun courriel n'est envoyé** : ils sont écrits dans la console et la table `email_outbox` (les liens de confirmation y sont lisibles).

Créer le premier administrateur : inscrivez-vous sur le site, puis
```bash
npm run make-admin -- votre@courriel.ca
```
(l'admin doit aussi avoir confirmé son courriel pour accéder à `/admin`).

## Tests

```bash
npm test                                   # classificateur (22 cas)
npm run build && npm start -- -p 3100 &    # serveur de test
npm run e2e                                # 50 vérifications de bout en bout (refuse de tourner hors base locale)
```

`e2e` couvre : inscription/consentement, confirmation du courriel (usage unique), mot de passe oublié et révocation des sessions, portail commerçant (approbation, offres, import CSV, droits d'accès), alertes et désabonnement, pages SEO, limitation des tentatives.

## Mise en ligne (guide — non testé sur ces plateformes)

1. **Base Postgres gérée** (Neon, Supabase, RDS…) → `DATABASE_URL`. Lancez `npm run db:migrate` une fois.
2. **Courriel** : créez un compte [Resend](https://resend.com), vérifiez votre domaine (SPF/DKIM), puis renseignez `RESEND_API_KEY` et `MAIL_FROM`.
3. **Hébergement Next.js** (Vercel, Render, Fly.io…) : variables d'environnement de `.env.example` — surtout `AUTH_SECRET` (long et aléatoire), `APP_URL` (URL publique HTTPS), `DATABASE_URL`.
4. **Alertes quotidiennes** : planifiez un appel `GET /api/cron/alerts` avec l'en-tête `Authorization: Bearer <CRON_SECRET>` (Vercel Cron l'envoie automatiquement si `CRON_SECRET` est défini), ou lancez `npm run alerts` depuis un cron. Sans `CRON_SECRET`, la route reste fermée.
5. **Collecte de données** : `npm run collect` depuis un cron (GitHub Actions, serveur…) une à deux fois par jour.
6. Remplacez les `[CHAMPS]` des pages `/conditions` et `/confidentialite`, **faites-les valider**, puis supprimez les données démo (`DELETE FROM promotions WHERE is_demo;`).
7. Soumettez `https://votredomaine/sitemap.xml` à Google Search Console.

Derrière un proxy/CDN, assurez-vous que l'en-tête `x-forwarded-for` est fourni (utilisé par la limitation des tentatives).

## Les données

- Les promotions de `db:seed` sont **fictives** (bandeau « démonstration » affiché tant qu'il en reste).
- Voies recommandées pour des données réelles : **portail commerçant** (déjà construit), flux/API officiels via `collectors.config.json` (voir `collectors.config.example.json`), ou collecteur sur mesure dans `collectors/`.
- **Aucun scraper de commerçant n'est inclus.** Vérifiez les conditions d'utilisation et le `robots.txt` d'un site avant toute collecte automatisée ; les circulaires sont protégées par le droit d'auteur.

## Classification

`lib/categories.ts` (21 types, mots-clés) + `lib/classifier.ts`. Un produit non reconnu va dans « Autres » ; un commerçant peut aussi choisir la catégorie à la main. Ajoutez des cas dans `scripts/test-classifier.ts` pour améliorer la précision.

## Structure

```
app/            pages + server actions (accueil, comptes, alertes, commercant/, admin/, SEO)
components/     cartes, formulaires
lib/            db, auth, courriel, jetons, limiteur, requêtes, classificateur, ingestion, alertes
collectors/     démo + adaptateur JSON générique
scripts/        migrate, collect, send-alerts, make-admin, e2e, tests
db/schema.sql   schéma Postgres (migrations additives et idempotentes)
```

## Limites connues / suite possible

- Pas de recherche du « magasin le plus proche » : il faut des adresses de succursales (à fournir par les commerçants ou une source de données).
- Pas de suppression de compte en libre-service (à demander par courriel au responsable de la vie privée).
- Installable sur l'écran d'accueil, mais sans mode hors-ligne.
- Pas de pagination/recherche dans la console admin au-delà des 20 dernières offres de commerçants.
- `npm audit` signale une dépendance PostCSS interne à Next.js (compilation seulement) ; mettre à jour Next.js quand une version corrigée sans rupture est disponible.
