
-- 1. Reassign posts from duplicate EPR Staff accounts to consolidated Editorial Team (1052)
UPDATE public.posts SET author_id = 1052 WHERE author_id IN (29, 30, 4750);

-- 2. Delete posts by Jessica VerSteeg (34) and Jay Sekulow (40), incl. join rows
DELETE FROM public.post_categories WHERE post_id IN (SELECT id FROM public.posts WHERE author_id IN (34, 40));
DELETE FROM public.post_tags       WHERE post_id IN (SELECT id FROM public.posts WHERE author_id IN (34, 40));
DELETE FROM public.post_revisions  WHERE post_id IN (SELECT id FROM public.posts WHERE author_id IN (34, 40));
DELETE FROM public.internal_links  WHERE source_post_id IN (SELECT id FROM public.posts WHERE author_id IN (34, 40))
                                      OR target_post_id IN (SELECT id FROM public.posts WHERE author_id IN (34, 40));
DELETE FROM public.posts WHERE author_id IN (34, 40);

-- 3. Delete the now-empty author rows
DELETE FROM public.authors WHERE id IN (29, 30, 4750, 34, 40);

-- 4. Rename consolidated Editorial Team account (1052)
UPDATE public.authors
SET display_name = 'Editorial Team',
    slug = 'editorial-team',
    job_title = 'Editorial Team, Everything-PR',
    bio = '<p>The Everything-PR Editorial Team produces reporting, research, and analysis across thirty verticals — communications, reputation, AI visibility, public affairs, media systems, and digital discovery in the answer-engine era. Publishing since 2009.</p>'
WHERE id = 1052;

-- 5. Recompute post_count for all affected authors
UPDATE public.authors a
SET post_count = COALESCE((SELECT COUNT(*) FROM public.posts p WHERE p.author_id = a.id AND p.status = 'publish'), 0)
WHERE a.id IN (6, 1052, 20548, 20559, 20560, 20558, 20563, 20564, 5);

-- 6. 301 redirects for legacy author slugs
INSERT INTO public.redirects (source_path, target_path, status_code, enabled, notes)
VALUES
  ('/author/everything-pr-staff/', '/author/editorial-team', 301, true, 'Consolidated Editorial Team byline'),
  ('/author/everything-pr-staff',  '/author/editorial-team', 301, true, 'Consolidated Editorial Team byline'),
  ('/author/jaldo/',               '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/jaldo',                '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/john-goode/',          '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/john-goode',           '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/analytics-shortlist/', '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/analytics-shortlist',  '/author/editorial-team', 301, true, 'Merged duplicate EPR Staff account'),
  ('/author/jessicaversteeg/',     '/authors',               301, true, 'Removed contributor'),
  ('/author/jessicaversteeg',      '/authors',               301, true, 'Removed contributor'),
  ('/author/jaysekulow/',          '/authors',               301, true, 'Removed contributor'),
  ('/author/jaysekulow',           '/authors',               301, true, 'Removed contributor')
ON CONFLICT DO NOTHING;
