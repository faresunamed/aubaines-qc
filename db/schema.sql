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
