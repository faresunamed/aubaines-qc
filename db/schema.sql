CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS establishments (
  id       SERIAL PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  kind     TEXT NOT NULL,            -- epicerie, pharmacie, electronique, maison, ...
  website  TEXT,
  color    TEXT NOT NULL DEFAULT '#444444'
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  group_name TEXT NOT NULL,
  sort       INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promotions (
  id               SERIAL PRIMARY KEY,
  establishment_id INT NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  category_id      INT NOT NULL REFERENCES categories(id),
  external_id      TEXT NOT NULL,
  title            TEXT NOT NULL,
  brand            TEXT,
  description      TEXT,
  price            NUMERIC(10,2),
  regular_price    NUMERIC(10,2),
  discount_percent INT,
  unit             TEXT,
  image_url        TEXT,
  source_url       TEXT,
  valid_from       DATE,
  valid_to         DATE,
  search_text      TEXT NOT NULL,
  is_demo          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, external_id)
);

CREATE INDEX IF NOT EXISTS promotions_category_idx ON promotions (category_id);
CREATE INDEX IF NOT EXISTS promotions_establishment_idx ON promotions (establishment_id);
CREATE INDEX IF NOT EXISTS promotions_valid_to_idx ON promotions (valid_to);
CREATE INDEX IF NOT EXISTS promotions_discount_idx ON promotions (discount_percent DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS favorites (
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_id INT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_id)
);

-- ===== Phase 2 : rôles, jetons, commerçants, alertes (additif) =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','merchant','admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('verify','reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INT NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE IF NOT EXISTS email_outbox (   -- utilisé seulement en développement
  id         SERIAL PRIMARY KEY,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_profiles (
  user_id          INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name    TEXT NOT NULL,
  website          TEXT,
  phone            TEXT,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  establishment_id INT REFERENCES establishments(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ
);

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'collector';
-- Modération : 'published' (visible) ou 'pending' (extraction IA en attente de revue).
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
CREATE INDEX IF NOT EXISTS promotions_status_idx ON promotions (status);

CREATE TABLE IF NOT EXISTS alerts (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword          TEXT NOT NULL,
  category_id      INT REFERENCES categories(id) ON DELETE CASCADE,
  establishment_id INT REFERENCES establishments(id) ON DELETE CASCADE,
  min_discount     INT,
  last_checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_user_idx ON alerts (user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- ===== Données de référence : types de produits =====
-- (miroir de lib/categories.ts ; `npm run db:migrate` les resynchronise aussi)
INSERT INTO categories (slug, name, group_name, sort) VALUES
  ('fruits-legumes', 'Fruits et légumes', 'Épicerie', 0),
  ('viandes-poissons', 'Viandes et poissons', 'Épicerie', 1),
  ('produits-laitiers-oeufs', 'Produits laitiers et œufs', 'Épicerie', 2),
  ('boulangerie', 'Boulangerie et pâtisserie', 'Épicerie', 3),
  ('garde-manger', 'Garde-manger', 'Épicerie', 4),
  ('surgeles', 'Surgelés', 'Épicerie', 5),
  ('boissons', 'Boissons', 'Épicerie', 6),
  ('collations-confiseries', 'Collations et confiseries', 'Épicerie', 7),
  ('pharmacie-sante', 'Pharmacie et santé', 'Santé et beauté', 8),
  ('beaute-soins', 'Beauté et soins personnels', 'Santé et beauté', 9),
  ('bebe', 'Bébé et enfants', 'Famille', 10),
  ('animaux', 'Animaux', 'Famille', 11),
  ('entretien-menager', 'Entretien ménager', 'Maison', 12),
  ('maison-cuisine', 'Maison et cuisine', 'Maison', 13),
  ('electronique', 'Électronique et électroménagers', 'Maison', 14),
  ('quincaillerie-renovation', 'Quincaillerie et rénovation', 'Maison', 15),
  ('jardin-exterieur', 'Jardin et extérieur', 'Maison', 16),
  ('vetements', 'Vêtements et chaussures', 'Mode et loisirs', 17),
  ('sports-plein-air', 'Sports et plein air', 'Mode et loisirs', 18),
  ('jouets-jeux', 'Jouets et jeux', 'Mode et loisirs', 19),
  ('auto', 'Auto', 'Mode et loisirs', 20),
  ('autre', 'Autres', 'Divers', 21)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, group_name = EXCLUDED.group_name, sort = EXCLUDED.sort;

-- ===== Liste de courses =====
-- Prix par zone : NULL = valable partout ; sinon slug de zone (voir lib/zones.ts).
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS zone_slug TEXT;
CREATE INDEX IF NOT EXISTS promotions_zone_idx ON promotions (zone_slug);

CREATE TABLE IF NOT EXISTS shopping_items (
  id           SERIAL PRIMARY KEY,
  user_id      INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  qty          INT  NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 99),
  promotion_id INT  REFERENCES promotions(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shopping_items_user_idx ON shopping_items (user_id);

CREATE TABLE IF NOT EXISTS shopping_prefs (
  user_id     INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  postal_code TEXT,
  zone_slug   TEXT,
  mode        TEXT NOT NULL DEFAULT 'voiture',
  multi_store BOOLEAN NOT NULL DEFAULT TRUE,
  max_stops   INT NOT NULL DEFAULT 3 CHECK (max_stops BETWEEN 1 AND 4),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adresse (facultative) et position de départ, + cache des recherches de succursales.
ALTER TABLE shopping_prefs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE shopping_prefs ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE shopping_prefs ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE shopping_prefs ADD COLUMN IF NOT EXISTS geo_precise BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS place_cache (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Sécurité (important sur Supabase) =====
-- Supabase expose les tables du schéma « public » via une API REST publique
-- (clé « anon »). Le site se connecte directement à Postgres, donc on ferme
-- cette porte : RLS activée sans aucune politique = accès refusé à l'API.
-- Le rôle « postgres » utilisé par l'application contourne la RLS.
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox      ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_prefs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_cache       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
  END IF;
END $$;

-- ===== Accès par l'API Supabase (SUPABASE_URL + clé secrète) =====
-- Le site peut interroger la base par l'API HTTPS de Supabase, sans adresse Postgres :
-- il appelle cette fonction via  POST /rest/v1/rpc/app_query  avec la CLÉ SECRÈTE.
-- Elle exécute UNE instruction paramétrée (SELECT / INSERT / UPDATE / DELETE / WITH).
-- Garde-fous : réservée au rôle service_role (clé secrète) ; refusée aux clés publiques ;
-- une seule instruction, pas de DDL ; les valeurs sont échappées avec quote_nullable en un
-- seul passage (une valeur contenant « $2 » n'est jamais réinterprétée) ; la fonction
-- s'exécute avec les droits de l'appelant (service_role), pas ceux du propriétaire.
CREATE OR REPLACE FUNCTION public.app_query(
  p_sql          text,
  p_params       jsonb   DEFAULT '[]'::jsonb,
  p_returns_rows boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_out    text := '';
  v_rest   text := p_sql;
  v_m      text[];
  v_idx    int;
  v_result jsonb;
BEGIN
  IF p_sql IS NULL OR length(p_sql) > 20000 THEN
    RAISE EXCEPTION 'requête invalide';
  END IF;
  IF position(';' in p_sql) > 0 THEN
    RAISE EXCEPTION 'une seule instruction est autorisée';
  END IF;
  IF p_sql !~* '^\s*(select|insert|update|delete|with)\s' THEN
    RAISE EXCEPTION 'instruction non autorisée';
  END IF;
  IF p_params IS NULL OR jsonb_typeof(p_params) <> 'array' THEN
    RAISE EXCEPTION 'paramètres invalides';
  END IF;

  -- Substitution des $1, $2… en UN passage : le texte déjà substitué n'est jamais relu.
  LOOP
    v_m := regexp_match(v_rest, '^([^$]*)\$([0-9]+)(.*)$');
    EXIT WHEN v_m IS NULL;
    v_idx := v_m[2]::int;
    IF v_idx < 1 OR v_idx > jsonb_array_length(p_params) THEN
      RAISE EXCEPTION 'paramètre $% manquant', v_idx;
    END IF;
    v_out  := v_out || v_m[1] || quote_nullable(p_params ->> (v_idx - 1));
    v_rest := v_m[3];
  END LOOP;
  v_out := v_out || v_rest;

  IF p_returns_rows THEN
    EXECUTE 'WITH r AS (' || v_out || ') SELECT COALESCE(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) FROM r'
      INTO v_result;
    RETURN v_result;
  END IF;

  EXECUTE v_out;
  RETURN '[]'::jsonb;
END
$fn$;

REVOKE ALL ON FUNCTION public.app_query(text, jsonb, boolean) FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.app_query(text, jsonb, boolean) FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT EXECUTE ON FUNCTION public.app_query(text, jsonb, boolean) TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
