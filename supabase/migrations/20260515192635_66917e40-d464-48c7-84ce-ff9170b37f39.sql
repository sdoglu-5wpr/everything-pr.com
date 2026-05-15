
-- 1. AI — canonical /ai-pr
UPDATE pillars p SET
  body_html = po.content_html,
  title = COALESCE(NULLIF(p.title,''), po.title),
  subtitle = COALESCE(p.subtitle, po.excerpt),
  hero_image_url = COALESCE(p.hero_image_url, m.url),
  published = true,
  updated_at = now()
FROM posts po
LEFT JOIN media m ON m.id = po.featured_media_id
WHERE p.slug = 'ai-pr' AND po.slug = 'ai';

UPDATE posts SET status='draft', updated_at=now() WHERE slug='ai';
UPDATE pillars SET published=false WHERE slug='ai';

UPDATE posts SET pillar_slug='ai-pr' WHERE id IN (
  SELECT pc.post_id FROM post_categories pc
  JOIN categories c ON c.id=pc.category_id
  WHERE c.slug IN ('ai','ai-pr')
);

-- 2. HEALTHCARE
UPDATE pillars SET
  body_html = (SELECT body_html FROM pillars WHERE slug='healthcare-pr')
              || E'\n<hr/>\n<h2>Health Tech</h2>\n'
              || (SELECT body_html FROM pillars WHERE slug='health-tech'),
  title = COALESCE((SELECT title FROM pillars WHERE slug='healthcare-pr'), 'Healthcare PR'),
  subtitle = (SELECT subtitle FROM pillars WHERE slug='healthcare-pr'),
  hero_image_url = COALESCE(hero_image_url,
                    (SELECT hero_image_url FROM pillars WHERE slug='healthcare-pr'),
                    (SELECT hero_image_url FROM pillars WHERE slug='health-tech')),
  faq = (SELECT faq FROM pillars WHERE slug='healthcare-pr'),
  schema_jsonld = (SELECT schema_jsonld FROM pillars WHERE slug='healthcare-pr'),
  published = true,
  updated_at = now()
WHERE slug = 'healthcare';

UPDATE posts SET pillar_slug='healthcare' WHERE id IN (
  SELECT pc.post_id FROM post_categories pc
  JOIN categories c ON c.id=pc.category_id
  WHERE c.slug IN ('healthcare-pr','health-tech','healthcare')
);
UPDATE posts SET pillar_slug='healthcare' WHERE pillar_slug IN ('healthcare-pr','health-tech');

UPDATE pillars SET published=false WHERE slug IN ('healthcare-pr','health-tech');
UPDATE posts SET status='draft', updated_at=now() WHERE slug='health-tech';

DELETE FROM redirects WHERE source_path IN ('/healthcare','/healthcare/');

-- 3. GEO
UPDATE pillars SET
  body_html = (SELECT body_html FROM pillars WHERE slug='geo'),
  title = (SELECT title FROM pillars WHERE slug='geo'),
  subtitle = (SELECT subtitle FROM pillars WHERE slug='geo'),
  hero_image_url = COALESCE(hero_image_url, (SELECT hero_image_url FROM pillars WHERE slug='geo')),
  faq = (SELECT faq FROM pillars WHERE slug='geo'),
  schema_jsonld = (SELECT schema_jsonld FROM pillars WHERE slug='geo'),
  published = true,
  updated_at = now()
WHERE slug = 'generative-engine-optimization';

UPDATE posts SET pillar_slug='generative-engine-optimization' WHERE pillar_slug='geo';
UPDATE pillars SET published=false WHERE slug='geo';

-- 4. BEAUTY
UPDATE pillars SET published=false WHERE slug='beauty-fashion';
UPDATE posts SET pillar_slug='beauty' WHERE id IN (
  SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='beauty'
);

-- 5. CRISIS
UPDATE posts SET pillar_slug='crisis-pr' WHERE id IN (
  SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='crisis-pr'
);

-- 6. Legacy -pr cats → clean pillar slugs
UPDATE posts SET pillar_slug='consumer-brands' WHERE id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='consumer-pr');
UPDATE posts SET pillar_slug='corporate-communications' WHERE id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='corporate-pr');
UPDATE posts SET pillar_slug='digital-marketing' WHERE id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='digital-pr');
UPDATE posts SET pillar_slug='technology' WHERE id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='technology-pr');
UPDATE posts SET pillar_slug='education' WHERE id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.slug='university-pr');

-- 7. Redirects (id auto-generated)
INSERT INTO redirects (source_path, target_path, status_code, enabled)
SELECT v.s, v.t, 301, true
FROM (VALUES
  ('/ai','/ai-pr'), ('/ai/','/ai-pr'),
  ('/healthcare-pr','/healthcare'), ('/healthcare-pr/','/healthcare'),
  ('/health-tech','/healthcare'), ('/health-tech/','/healthcare'),
  ('/geo','/generative-engine-optimization'), ('/geo/','/generative-engine-optimization'),
  ('/beauty-fashion','/beauty'), ('/beauty-fashion/','/beauty'),
  ('/cyber','/cybersecurity'), ('/cyber/','/cybersecurity'),
  ('/finserv','/financial-services'), ('/finserv/','/financial-services'),
  ('/crisis','/crisis-pr'), ('/crisis/','/crisis-pr'),
  ('/entertainment','/entertainment-media'), ('/entertainment/','/entertainment-media'),
  ('/gambling-pr','/gambling'), ('/gambling-pr/','/gambling'),
  ('/consumer-pr','/consumer-brands'), ('/consumer-pr/','/consumer-brands'),
  ('/corporate-pr','/corporate-communications'), ('/corporate-pr/','/corporate-communications'),
  ('/digital-pr','/digital-marketing'), ('/digital-pr/','/digital-marketing'),
  ('/technology-pr','/technology'), ('/technology-pr/','/technology'),
  ('/university-pr','/education'), ('/university-pr/','/education')
) AS v(s,t)
WHERE NOT EXISTS (SELECT 1 FROM redirects r WHERE r.source_path = v.s);
