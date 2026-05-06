-- Link posts from -pr counterpart categories into the new pillar categories
WITH mapping(pillar_slug, source_slugs) AS (
  VALUES
    ('hospitality', ARRAY['hospitality-pr','travel-pr']),
    ('beauty', ARRAY['beauty-pr']),
    ('cannabis', ARRAY['cannabis-pr']),
    ('cpg', ARRAY['cpg-pr']),
    ('adtech', ARRAY['adtech-pr']),
    ('cybersecurity', ARRAY['cybersecurity-pr']),
    ('ai-communications', ARRAY['ai-pr']),
    ('financial-services', ARRAY['financial-services-pr']),
    ('health-tech', ARRAY['health-tech-pr']),
    ('gambling', ARRAY['gambling-pr'])
),
target AS (
  SELECT c.id AS pillar_id, m.source_slugs
  FROM mapping m JOIN public.categories c ON c.slug = m.pillar_slug
),
src AS (
  SELECT t.pillar_id, sc.id AS source_id
  FROM target t
  JOIN public.categories sc ON sc.slug = ANY(t.source_slugs)
)
INSERT INTO public.post_categories (post_id, category_id)
SELECT DISTINCT pc.post_id, s.pillar_id
FROM src s
JOIN public.post_categories pc ON pc.category_id = s.source_id
JOIN public.posts p ON p.id = pc.post_id
WHERE p.type = 'post' AND p.status = 'publish'
ON CONFLICT DO NOTHING;

-- Refresh post_count on affected categories
UPDATE public.categories c
SET post_count = sub.cnt, updated_at = now()
FROM (
  SELECT category_id, count(*)::int AS cnt
  FROM public.post_categories pc
  JOIN public.posts p ON p.id = pc.post_id
  WHERE p.type = 'post' AND p.status = 'publish'
  GROUP BY category_id
) sub
WHERE c.id = sub.category_id
  AND c.slug IN ('hospitality','beauty','cannabis','cpg','adtech','cybersecurity','ai-communications','financial-services','health-tech','gambling');