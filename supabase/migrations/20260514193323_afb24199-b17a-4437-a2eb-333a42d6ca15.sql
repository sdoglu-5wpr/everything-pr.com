
-- =========================
-- STEP A: B2B → Enterprise SaaS
-- =========================

-- 1. Re-parent the 9 draft pillar articles
UPDATE posts
   SET pillar_slug = 'enterprise-saas',
       updated_at  = now()
 WHERE pillar_slug = 'b2b';

-- 2. Migrate 10 post_categories rows from cat 27955 → cat 27967
INSERT INTO post_categories (post_id, category_id)
SELECT post_id, 27967
  FROM post_categories
 WHERE category_id = 27955
ON CONFLICT DO NOTHING;

DELETE FROM post_categories WHERE category_id = 27955;

-- 3. Retire old B2B category + pillar landing
DELETE FROM pillars   WHERE id = 17;
DELETE FROM categories WHERE id = 27955;

-- 4. Add B2B → Enterprise SaaS redirects (landing + 10 articles)
INSERT INTO redirects (source_path, target_path, status_code, enabled, notes)
VALUES ('/b2b/', '/enterprise-saas/', 301, true, 'Phase 2N — B2B sector renamed to Enterprise SaaS')
ON CONFLICT DO NOTHING;

INSERT INTO redirects (source_path, target_path, status_code, enabled, notes)
SELECT '/b2b/' || p.slug || '/',
       '/enterprise-saas/' || p.slug || '/',
       301, true,
       'Phase 2N — B2B sector renamed to Enterprise SaaS'
  FROM posts p
 WHERE p.pillar_slug = 'enterprise-saas'
    OR p.id = 112725
ON CONFLICT DO NOTHING;

-- =========================
-- STEP C: Travel / Hospitality consolidation (Option A)
-- =========================

-- 1. Rename Travel & Hospitality categories
UPDATE categories SET name = 'Travel',      updated_at = now() WHERE id = 27961;
UPDATE categories SET name = 'Hospitality', updated_at = now() WHERE id = 27950;

-- 2. Merge travel-pr (cat 27716) → travel (cat 27961)
INSERT INTO post_categories (post_id, category_id)
SELECT post_id, 27961
  FROM post_categories
 WHERE category_id = 27716
ON CONFLICT DO NOTHING;

-- 3. Merge hospitality-pr (cat 27782) → hospitality (cat 27950)
INSERT INTO post_categories (post_id, category_id)
SELECT post_id, 27950
  FROM post_categories
 WHERE category_id = 27782
ON CONFLICT DO NOTHING;

-- 4. Capture per-article redirect rows BEFORE we drop the old links
INSERT INTO redirects (source_path, target_path, status_code, enabled, notes)
SELECT DISTINCT '/travel-pr/' || p.slug || '/',
                '/travel/' || p.slug || '/',
                301, true,
                'Phase 2N — Travel PR consolidated into Travel'
  FROM post_categories pc
  JOIN posts p ON p.id = pc.post_id
 WHERE pc.category_id = 27716
ON CONFLICT DO NOTHING;

INSERT INTO redirects (source_path, target_path, status_code, enabled, notes)
SELECT DISTINCT '/hospitality-pr/' || p.slug || '/',
                '/hospitality/' || p.slug || '/',
                301, true,
                'Phase 2N — Hospitality PR consolidated into Hospitality'
  FROM post_categories pc
  JOIN posts p ON p.id = pc.post_id
 WHERE pc.category_id = 27782
ON CONFLICT DO NOTHING;

-- 5. Landing redirects
INSERT INTO redirects (source_path, target_path, status_code, enabled, notes) VALUES
  ('/travel-pr/',      '/travel/',      301, true, 'Phase 2N — Travel PR consolidated into Travel'),
  ('/hospitality-pr/', '/hospitality/', 301, true, 'Phase 2N — Hospitality PR consolidated into Hospitality')
ON CONFLICT DO NOTHING;

-- 6. Drop legacy category links + the categories themselves
DELETE FROM post_categories WHERE category_id IN (27716, 27782);
DELETE FROM categories       WHERE id          IN (27716, 27782);

-- 7. Retitle pillars 11 + 23
UPDATE pillars SET title = 'Hospitality Communications', updated_at = now() WHERE id = 11;
UPDATE pillars SET title = 'Travel Communications',      updated_at = now() WHERE id = 23;

-- =========================
-- STUB COPY for new sector + discipline landings (pillars 30–52)
-- =========================
UPDATE pillars
   SET body_html = '<h1>' || regexp_replace(title, ' Communications.*$| & PR$', '') ||
                   '</h1>' || E'\n' ||
                   '<p>' || regexp_replace(title, ' Communications.*$| & PR$', '') ||
                   ' PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>',
       schema_jsonld = jsonb_build_object(
         '@context', 'https://schema.org',
         '@type',    'CollectionPage',
         'name',     title,
         'url',      '/' || slug || '/',
         'breadcrumb', jsonb_build_object(
           '@type', 'BreadcrumbList',
           'itemListElement', jsonb_build_array(
             jsonb_build_object('@type','ListItem','position',1,'name','Home','item','/'),
             jsonb_build_object('@type','ListItem','position',2,
                                'name', regexp_replace(title, ' Communications.*$| & PR$', ''),
                                'item','/' || slug || '/')
           )
         )
       ),
       published = false,
       updated_at = now()
 WHERE id BETWEEN 30 AND 52;
