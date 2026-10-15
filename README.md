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
| Agent IA | Extraction quotidienne des offres depuis des pages de circulaires **autorisées** → file « à réviser » dans `/admin` → publication manuelle |
| Liste de courses | Liste d'articles (saisie libre ou bouton « + Liste » sur une offre), code postal → zone, mode de déplacement ; quatre plans comparés (un seul magasin, le moins cher, le plus rapide, équilibré) avec **prix estimé**, **durée** (trajet + magasinage) et lien d'itinéraire Google Maps |
| Croissance | Pages publiques par commerce et par catégorie, `sitemap.xml`, `robots.txt`, balises sociales, application installable (manifest + icônes) |
| Légal | Ébauches des conditions d'utilisation et de la politique de confidentialité (Loi 25) — **à faire valider** |

## Démarrer en local

```bash
npm install
cp .env.example .env.local         # puis changez AUTH_SECRET
npm run db:dev                     # Postgres local (port 5433) — avec un utilisateur non-root
npm run db:migrate                 # crée/met à jour les tables (idempotent)
npm run db:seed                    # 90 promotions FICTIVES de démonstration (ou db/demo-data.sql)
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
npm run e2e                                # 50 vérifications de bout en bout, connexion Postgres directe (refuse de tourner hors base locale)
npm run e2e:api                            # mêmes 50 + auto-tests, le site en MODE API via le simulateur (sans adresse Postgres)
```

`e2e` couvre : inscription/consentement, confirmation du courriel (usage unique), mot de passe oublié et révocation des sessions, portail commerçant (approbation, offres, import CSV, droits d'accès), alertes et désabonnement, pages SEO, limitation des tentatives.

## Base de données sur Supabase

Le site sait parler à la base de deux façons ; il choisit tout seul (vérifiable sur `/api/health`, champ `mode`).

### Mode API (aucune adresse Postgres à fournir)

1. Dans Supabase : **SQL Editor → New query**, collez [`db/schema.sql`](db/schema.sql) et cliquez **Run**. Il crée les tables, les types de produits, active la sécurité par lignes (RLS) et crée la fonction `app_query` utilisée par l'API. Relançable sans danger : **refaites-le si vous aviez exécuté une version plus ancienne du script**.
2. Variables d'environnement de l'hébergeur : `SUPABASE_URL` et `SUPABASE_SECRET_KEY` (la clé **secrète**, `sb_secret_…`). L'intégration Vercel ↔ Supabase les crée normalement. `SUPABASE_SERVICE_ROLE_KEY` (ancienne clé) est aussi acceptée. Il faut en plus `AUTH_SECRET` et `APP_URL`.
3. Ouvrez `/api/health` : `{"ok":true,"mode":"api"}`.

Comment ça marche : le site appelle `POST /rest/v1/rpc/app_query` avec la clé secrète. Cette fonction exécute **une seule** instruction SQL paramétrée (SELECT/INSERT/UPDATE/DELETE) ; elle est **réservée au rôle `service_role`** (les clés publiques sont refusées), refuse le DDL et les instructions multiples, et échappe les valeurs en un seul passage.

À savoir :
- La clé secrète ne doit **jamais** être publique (pas de préfixe `NEXT_PUBLIC_`, pas dans le dépôt, pas dans une conversation). Si elle fuit : supprimez-la dans Supabase (**Project Settings → API Keys**), créez-en une autre et mettez-la à jour chez l'hébergeur.
- Chaque requête est un appel HTTP : un peu plus lent que la connexion directe.
- Les changements de structure (DDL) passent par le SQL Editor ; `npm run db:migrate` demande un Postgres direct.
- Testé avec un simulateur local de l'API Supabase (`npm run e2e:api`), **pas** contre un vrai projet Supabase.

### Mode direct (alternative)

Si `SUPABASE_URL`/clé secrète sont absentes, le site utilise `DATABASE_URL` (ou `POSTGRES_URL`) : adresse du **Transaction pooler** (port 6543) pour Vercel, **Session pooler** (port 5432) pour lancer `npm run db:migrate` depuis votre ordinateur. Le SSL est géré par le code (`DATABASE_CA` pour vérifier le certificat). `DB_MODE=api` ou `DB_MODE=pg` force un mode.

Optionnel, pour voir le site rempli : exécutez [`db/demo-data.sql`](db/demo-data.sql) (90 promotions **fictives**, dates relatives). Pour les retirer : `DELETE FROM promotions WHERE is_demo;`

Le plan gratuit de Supabase met le projet en pause après environ une semaine sans activité : il faut alors le réactiver depuis le tableau de bord.

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

## Agent IA d'extraction (quotidien)

Principe : une tâche planifiée lit des pages de circulaires, Claude en extrait des offres structurées, un validateur écarte tout ce qui n'est pas **vérifiable dans le texte de la page** (titre et prix) ou qui est expiré, puis les offres arrivent en statut **à réviser**. Rien n'est public tant qu'un admin n'a pas cliqué *Publier* dans `/admin` (« Rejeter » est mémorisé : l'offre n'est pas reproposée).

1. Mettre à jour la base : relancez `db/schema.sql` dans le SQL Editor Supabase (ajoute `promotions.status`).
2. Copiez `ai-sources.config.example.json` → `ai-sources.config.json`, ajoutez vos commerces et pages, et mettez `"authorized": true` **seulement** si vous avez le droit d'utiliser ces pages (entente, conditions d'utilisation). Le robot respecte aussi `robots.txt` et n'accepte que https.
3. Essai sans rien écrire : `ANTHROPIC_API_KEY=… npm run collect:ai -- --dry`, ou sur une page enregistrée : `npm run collect:ai -- --html page.html --name "Nom" --slug nom`.
4. Planification : le workflow `.github/workflows/daily-collect.yml` tourne chaque jour. Dans GitHub → Settings → Secrets, ajoutez `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY` et `AI_SOURCES_JSON` (le contenu du fichier de sources).

Limites : les pages qui s'affichent uniquement par JavaScript (circulaires interactives) ressortent vides ; un appel à l'API Anthropic est facturé à l'usage ; l'extraction reste une aide, d'où la revue humaine. Test sans clé : `npm run test:extract`.

## Liste de courses

Page `/courses` (connecté). Le moteur (`lib/shopping.ts`, testé par `npm test`) apparie chaque article aux offres publiées de la zone, puis compare des combinaisons de 1 à 4 commerces :
- **prix** : somme des offres les moins chères retenues (les articles sans offre ne sont pas comptés et sont listés) ;
- **durée** : trajet (distances moyennes par zone × vitesse du mode) + magasinage (8 min par commerce + 1,5 min par article) — des **estimations**, pas un calcul d'itinéraire réel ;
- **itinéraire** : lien Google Maps (départ = code postal, étapes = noms des commerces).
Les zones se déduisent du code postal (`lib/zones.ts`) ; `promotions.zone_slug` permet des prix propres à une zone (NULL = partout). La collecte automatique de prix par zone n'est pas encore faite : elle demande de choisir le magasin sur le site de chaque chaîne.
Pour la production Supabase : relancer `db/schema.sql` (nouvelles tables `shopping_items`, `shopping_prefs`).

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
