-- Données FICTIVES de démonstration (aucun prix réel). Idempotent : peut être relancé.
-- Pour tout retirer plus tard :  DELETE FROM promotions WHERE is_demo;
-- (les commerces de démo restent ; supprimez-les au besoin avec DELETE FROM establishments WHERE slug IN (...)).

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('iga', 'IGA', 'epicerie', 'https://www.iga.net', '#d6342c')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-iga-0', 'Poulet entier frais', 2.49, 4.99, 50, '/lb', 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'poulet entier frais iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-iga-1', 'Pommes McIntosh sac de 3 lb', 2.99, 5.99, 50, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pommes mcintosh sac de 3 lb iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'fruits-legumes'
UNION ALL
SELECT e.id, c.id, 'demo-iga-2', 'Fromage cheddar fort 400 g', 5.23, 7.49, 30, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'fromage cheddar fort 400 g iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-iga-3', 'Pizza surgelée 4 fromages', 5.23, 6.99, 25, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pizza surgelee 4 fromages iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'surgeles'
UNION ALL
SELECT e.id, c.id, 'demo-iga-4', 'Pain tranché de blé entier', 2.83, 3.79, 25, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pain tranche de ble entier iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'boulangerie'
UNION ALL
SELECT e.id, c.id, 'demo-iga-5', 'Café moulu 920 g', 10.48, 14.99, 30, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'cafe moulu 920 g iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'garde-manger'
UNION ALL
SELECT e.id, c.id, 'demo-iga-6', 'Croustilles 235 g', 3.36, 4.49, 25, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'croustilles 235 g iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'collations-confiseries'
UNION ALL
SELECT e.id, c.id, 'demo-iga-7', 'Bière IPA 6 x 473 ml', 9.36, 13.99, 33, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'biere ipa 6 x 473 ml iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'boissons'
UNION ALL
SELECT e.id, c.id, 'demo-iga-8', 'Saumon atlantique filet', 6.99, 13.99, 50, '/lb', 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'saumon atlantique filet iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-iga-9', 'Yogourt grec 650 g', 3.67, 5.49, 33, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'yogourt grec 650 g iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-iga-10', 'Papier hygiénique 24 rouleaux', 13.48, 17.99, 25, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'papier hygienique 24 rouleaux iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'entretien-menager'
UNION ALL
SELECT e.id, c.id, 'demo-iga-11', 'Oeufs gros calibre, douzaine', 2.49, 4.99, 50, NULL, 'https://www.iga.net', CURRENT_DATE - 2, CURRENT_DATE + 5, 'oeufs gros calibre douzaine iga' FROM establishments e, categories c WHERE e.slug = 'iga' AND c.slug = 'produits-laitiers-oeufs'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('metro', 'Metro', 'epicerie', 'https://www.metro.ca', '#e0771e')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-metro-0', 'Poulet entier frais', 3.73, 4.99, 25, '/lb', 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'poulet entier frais metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-metro-1', 'Pommes McIntosh sac de 3 lb', 3.58, 5.99, 40, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pommes mcintosh sac de 3 lb metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'fruits-legumes'
UNION ALL
SELECT e.id, c.id, 'demo-metro-2', 'Fromage cheddar fort 400 g', 5.98, 7.49, 20, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'fromage cheddar fort 400 g metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-metro-3', 'Pizza surgelée 4 fromages', 5.93, 6.99, 15, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pizza surgelee 4 fromages metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'surgeles'
UNION ALL
SELECT e.id, c.id, 'demo-metro-4', 'Pain tranché de blé entier', 3.02, 3.79, 20, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pain tranche de ble entier metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'boulangerie'
UNION ALL
SELECT e.id, c.id, 'demo-metro-5', 'Café moulu 920 g', 12.73, 14.99, 15, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'cafe moulu 920 g metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'garde-manger'
UNION ALL
SELECT e.id, c.id, 'demo-metro-6', 'Croustilles 235 g', 2.24, 4.49, 50, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'croustilles 235 g metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'collations-confiseries'
UNION ALL
SELECT e.id, c.id, 'demo-metro-7', 'Bière IPA 6 x 473 ml', 9.36, 13.99, 33, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'biere ipa 6 x 473 ml metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'boissons'
UNION ALL
SELECT e.id, c.id, 'demo-metro-8', 'Saumon atlantique filet', 11.88, 13.99, 15, '/lb', 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'saumon atlantique filet metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-metro-9', 'Yogourt grec 650 g', 3.28, 5.49, 40, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'yogourt grec 650 g metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-metro-10', 'Papier hygiénique 24 rouleaux', 12.04, 17.99, 33, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'papier hygienique 24 rouleaux metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'entretien-menager'
UNION ALL
SELECT e.id, c.id, 'demo-metro-11', 'Oeufs gros calibre, douzaine', 3.73, 4.99, 25, NULL, 'https://www.metro.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'oeufs gros calibre douzaine metro' FROM establishments e, categories c WHERE e.slug = 'metro' AND c.slug = 'produits-laitiers-oeufs'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('maxi', 'Maxi', 'epicerie', 'https://www.maxi.ca', '#1f5fa8')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-maxi-0', 'Poulet entier frais', 3.33, 4.99, 33, '/lb', 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'poulet entier frais maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-1', 'Pommes McIntosh sac de 3 lb', 3.58, 5.99, 40, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pommes mcintosh sac de 3 lb maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'fruits-legumes'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-2', 'Fromage cheddar fort 400 g', 3.74, 7.49, 50, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'fromage cheddar fort 400 g maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-3', 'Pizza surgelée 4 fromages', 5.93, 6.99, 15, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pizza surgelee 4 fromages maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'surgeles'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-4', 'Pain tranché de blé entier', 3.02, 3.79, 20, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pain tranche de ble entier maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'boulangerie'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-5', 'Café moulu 920 g', 10.03, 14.99, 33, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'cafe moulu 920 g maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'garde-manger'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-6', 'Croustilles 235 g', 3.81, 4.49, 15, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'croustilles 235 g maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'collations-confiseries'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-7', 'Bière IPA 6 x 473 ml', 9.36, 13.99, 33, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'biere ipa 6 x 473 ml maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'boissons'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-8', 'Saumon atlantique filet', 6.99, 13.99, 50, '/lb', 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'saumon atlantique filet maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-9', 'Yogourt grec 650 g', 2.74, 5.49, 50, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'yogourt grec 650 g maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-10', 'Papier hygiénique 24 rouleaux', 14.38, 17.99, 20, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'papier hygienique 24 rouleaux maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'entretien-menager'
UNION ALL
SELECT e.id, c.id, 'demo-maxi-11', 'Oeufs gros calibre, douzaine', 3.48, 4.99, 30, NULL, 'https://www.maxi.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'oeufs gros calibre douzaine maxi' FROM establishments e, categories c WHERE e.slug = 'maxi' AND c.slug = 'produits-laitiers-oeufs'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('super-c', 'Super C', 'epicerie', 'https://www.superc.ca', '#c8102e')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-super-c-0', 'Poulet entier frais', 2.98, 4.99, 40, '/lb', 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'poulet entier frais super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-1', 'Pommes McIntosh sac de 3 lb', 2.99, 5.99, 50, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pommes mcintosh sac de 3 lb super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'fruits-legumes'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-2', 'Fromage cheddar fort 400 g', 3.74, 7.49, 50, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'fromage cheddar fort 400 g super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-3', 'Pizza surgelée 4 fromages', 4.67, 6.99, 33, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pizza surgelee 4 fromages super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'surgeles'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-4', 'Pain tranché de blé entier', 2.26, 3.79, 40, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pain tranche de ble entier super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'boulangerie'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-5', 'Café moulu 920 g', 11.23, 14.99, 25, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'cafe moulu 920 g super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'garde-manger'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-6', 'Croustilles 235 g', 3.36, 4.49, 25, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'croustilles 235 g super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'collations-confiseries'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-7', 'Bière IPA 6 x 473 ml', 11.18, 13.99, 20, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'biere ipa 6 x 473 ml super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'boissons'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-8', 'Saumon atlantique filet', 11.88, 13.99, 15, '/lb', 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'saumon atlantique filet super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'viandes-poissons'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-9', 'Yogourt grec 650 g', 4.11, 5.49, 25, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'yogourt grec 650 g super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'produits-laitiers-oeufs'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-10', 'Papier hygiénique 24 rouleaux', 12.04, 17.99, 33, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'papier hygienique 24 rouleaux super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'entretien-menager'
UNION ALL
SELECT e.id, c.id, 'demo-super-c-11', 'Oeufs gros calibre, douzaine', 3.33, 4.99, 33, NULL, 'https://www.superc.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'oeufs gros calibre douzaine super c' FROM establishments e, categories c WHERE e.slug = 'super-c' AND c.slug = 'produits-laitiers-oeufs'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('jean-coutu', 'Jean Coutu', 'pharmacie', 'https://www.jeancoutu.com', '#0a7d5a')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-jean-coutu-0', 'Vitamine D 1000 UI, 180 capsules', 8.48, 16.99, 50, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'vitamine d 1000 ui 180 capsules jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'pharmacie-sante'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-1', 'Shampooing 750 ml', 6.68, 9.99, 33, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'shampooing 750 ml jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-2', 'Dentifrice 120 ml', 4.23, 4.99, 15, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'dentifrice 120 ml jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-3', 'Couches format géant', 24.48, 34.99, 30, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'couches format geant jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'bebe'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-4', 'Analgésique ibuprofène 200 mg, 144 comprimés', 8.98, 17.99, 50, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'analgesique ibuprofene 200 mg 144 comprimes jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'pharmacie-sante'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-5', 'Lotion hydratante pour le corps', 8.98, 11.99, 25, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'lotion hydratante pour le corps jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-6', 'Déodorant 85 g', 3.24, 6.49, 50, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'deodorant 85 g jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-jean-coutu-7', 'Lingettes pour bébé, paquet de 3', 10.38, 12.99, 20, NULL, 'https://www.jeancoutu.com', CURRENT_DATE - 2, CURRENT_DATE + 5, 'lingettes pour bebe paquet de 3 jean coutu' FROM establishments e, categories c WHERE e.slug = 'jean-coutu' AND c.slug = 'bebe'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('pharmaprix', 'Pharmaprix', 'pharmacie', 'https://www.pharmaprix.ca', '#cf2e8c')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-pharmaprix-0', 'Vitamine D 1000 UI, 180 capsules', 11.37, 16.99, 33, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'vitamine d 1000 ui 180 capsules pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'pharmacie-sante'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-1', 'Shampooing 750 ml', 8.48, 9.99, 15, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'shampooing 750 ml pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-2', 'Dentifrice 120 ml', 3.33, 4.99, 33, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'dentifrice 120 ml pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-3', 'Couches format géant', 20.98, 34.99, 40, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'couches format geant pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'bebe'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-4', 'Analgésique ibuprofène 200 mg, 144 comprimés', 8.98, 17.99, 50, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'analgesique ibuprofene 200 mg 144 comprimes pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'pharmacie-sante'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-5', 'Lotion hydratante pour le corps', 10.18, 11.99, 15, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'lotion hydratante pour le corps pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-6', 'Déodorant 85 g', 5.51, 6.49, 15, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'deodorant 85 g pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'beaute-soins'
UNION ALL
SELECT e.id, c.id, 'demo-pharmaprix-7', 'Lingettes pour bébé, paquet de 3', 8.69, 12.99, 33, NULL, 'https://www.pharmaprix.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'lingettes pour bebe paquet de 3 pharmaprix' FROM establishments e, categories c WHERE e.slug = 'pharmaprix' AND c.slug = 'bebe'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('best-buy', 'Best Buy', 'electronique', 'https://www.bestbuy.ca', '#1b3d8f')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-best-buy-0', 'Téléviseur 55 po 4K', 435.48, 649.99, 33, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'televiseur 55 po 4k best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
UNION ALL
SELECT e.id, c.id, 'demo-best-buy-1', 'Écouteurs sans fil', 143.98, 179.99, 20, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'ecouteurs sans fil best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
UNION ALL
SELECT e.id, c.id, 'demo-best-buy-2', 'Ordinateur portable 15,6 po', 679.98, 799.99, 15, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'ordinateur portable 15 6 po best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
UNION ALL
SELECT e.id, c.id, 'demo-best-buy-3', 'Aspirateur robot', 319.98, 399.99, 20, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'aspirateur robot best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
UNION ALL
SELECT e.id, c.id, 'demo-best-buy-4', 'Barre de son avec caisson de basses', 200.98, 299.99, 33, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'barre de son avec caisson de basses best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
UNION ALL
SELECT e.id, c.id, 'demo-best-buy-5', 'Console de jeu, ensemble de base', 329.98, 549.99, 40, NULL, 'https://www.bestbuy.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'console de jeu ensemble de base best buy' FROM establishments e, categories c WHERE e.slug = 'best-buy' AND c.slug = 'electronique'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('canadian-tire', 'Canadian Tire', 'maison', 'https://www.canadiantire.ca', '#c8102e')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-canadian-tire-0', 'Mijoteuse 6 L', 41.98, 59.99, 30, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'mijoteuse 6 l canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'maison-cuisine'
UNION ALL
SELECT e.id, c.id, 'demo-canadian-tire-1', 'Pneus d''hiver, ensemble de 4', 479.98, 599.99, 20, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'pneus d hiver ensemble de 4 canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'auto'
UNION ALL
SELECT e.id, c.id, 'demo-canadian-tire-2', 'Tente 4 personnes', 149.98, 199.99, 25, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'tente 4 personnes canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'sports-plein-air'
UNION ALL
SELECT e.id, c.id, 'demo-canadian-tire-3', 'Vélo de montagne adulte', 337.48, 449.99, 25, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'velo de montagne adulte canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'sports-plein-air'
UNION ALL
SELECT e.id, c.id, 'demo-canadian-tire-4', 'Barbecue au propane 4 brûleurs', 299.98, 499.99, 40, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'barbecue au propane 4 bruleurs canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'jardin-exterieur'
UNION ALL
SELECT e.id, c.id, 'demo-canadian-tire-5', 'Ensemble de casseroles 10 pièces', 64.99, 129.99, 50, NULL, 'https://www.canadiantire.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'ensemble de casseroles 10 pieces canadian tire' FROM establishments e, categories c WHERE e.slug = 'canadian-tire' AND c.slug = 'maison-cuisine'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('rona', 'RONA', 'renovation', 'https://www.rona.ca', '#0c5ea7')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-rona-0', 'Perceuse sans fil 20 V', 110.48, 129.99, 15, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'perceuse sans fil 20 v rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'quincaillerie-renovation'
UNION ALL
SELECT e.id, c.id, 'demo-rona-1', 'Peinture intérieure 3,78 L', 29.98, 49.99, 40, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'peinture interieure 3 78 l rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'quincaillerie-renovation'
UNION ALL
SELECT e.id, c.id, 'demo-rona-2', 'Souffleuse à neige électrique', 262.48, 349.99, 25, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'souffleuse a neige electrique rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'jardin-exterieur'
UNION ALL
SELECT e.id, c.id, 'demo-rona-3', 'Ampoules DEL, paquet de 8', 7.99, 15.99, 50, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'ampoules del paquet de 8 rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'quincaillerie-renovation'
UNION ALL
SELECT e.id, c.id, 'demo-rona-4', 'Coffre à outils 120 pièces', 84.98, 99.99, 15, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'coffre a outils 120 pieces rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'quincaillerie-renovation'
UNION ALL
SELECT e.id, c.id, 'demo-rona-5', 'Sel de déglaçage 20 kg', 9.58, 11.99, 20, NULL, 'https://www.rona.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'sel de deglacage 20 kg rona' FROM establishments e, categories c WHERE e.slug = 'rona' AND c.slug = 'jardin-exterieur'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();

INSERT INTO establishments (slug, name, kind, website, color) VALUES ('walmart', 'Walmart', 'magasin', 'https://www.walmart.ca', '#0071ce')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, website = EXCLUDED.website, color = EXCLUDED.color;
INSERT INTO promotions (establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text, is_demo, source)
SELECT s.*, TRUE, 'collector' FROM (
SELECT e.id, c.id, 'demo-walmart-0', 'Manteau d''hiver pour homme', 62.98, 89.99, 30, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'manteau d hiver pour homme walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'vetements'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-1', 'Bottes d''hiver pour femme', 56.23, 74.99, 25, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'bottes d hiver pour femme walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'vetements'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-2', 'Ensemble LEGO', 50.98, 59.99, 15, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'ensemble lego walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'jouets-jeux'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-3', 'Nourriture pour chien 12 kg', 26.78, 39.99, 33, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'nourriture pour chien 12 kg walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'animaux'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-4', 'Litière pour chat 18 kg', 13.18, 21.99, 40, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'litiere pour chat 18 kg walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'animaux'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-5', 'Couverture en peluche', 17.48, 24.99, 30, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'couverture en peluche walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'maison-cuisine'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-6', 'Détergent à lessive 4,43 L', 15.28, 17.99, 15, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'detergent a lessive 4 43 l walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'entretien-menager'
UNION ALL
SELECT e.id, c.id, 'demo-walmart-7', 'Chaudron et jouets pour bébé', 11.98, 19.99, 40, NULL, 'https://www.walmart.ca', CURRENT_DATE - 2, CURRENT_DATE + 5, 'chaudron et jouets pour bebe walmart' FROM establishments e, categories c WHERE e.slug = 'walmart' AND c.slug = 'jouets-jeux'
) AS s(establishment_id, category_id, external_id, title, price, regular_price, discount_percent, unit, source_url, valid_from, valid_to, search_text)
ON CONFLICT (establishment_id, external_id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title,
  price = EXCLUDED.price, regular_price = EXCLUDED.regular_price, discount_percent = EXCLUDED.discount_percent, unit = EXCLUDED.unit,
  valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, search_text = EXCLUDED.search_text, updated_at = now();
