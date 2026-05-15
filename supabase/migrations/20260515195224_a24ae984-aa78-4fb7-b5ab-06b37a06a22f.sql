-- 1) Break the /geo ↔ /generative-engine-optimization loop
DELETE FROM redirects
WHERE source_path IN ('/generative-engine-optimization','/generative-engine-optimization/')
  AND target_path IN ('/geo','/geo/');

-- 2) Seed missing /ai-pr pillar from the long-form /ai post (id 112308)
INSERT INTO pillars (id, slug, title, subtitle, body_html, hero_image_url, published, faq)
SELECT
  (SELECT COALESCE(MAX(id),0)+1 FROM pillars),
  'ai-pr',
  'AI Communications & PR',
  p.excerpt,
  p.content_html,
  m.url,
  true,
  '[]'::jsonb
FROM posts p
LEFT JOIN media m ON m.id = p.featured_media_id
WHERE p.id = 112308
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = COALESCE(EXCLUDED.subtitle, pillars.subtitle),
  body_html = CASE WHEN length(pillars.body_html) < length(EXCLUDED.body_html)
                   THEN EXCLUDED.body_html ELSE pillars.body_html END,
  hero_image_url = COALESCE(EXCLUDED.hero_image_url, pillars.hero_image_url),
  published = true,
  updated_at = now();

-- 3) Keep duplicate pillars unpublished
UPDATE pillars SET published = false, updated_at = now() WHERE slug IN ('ai','geo');