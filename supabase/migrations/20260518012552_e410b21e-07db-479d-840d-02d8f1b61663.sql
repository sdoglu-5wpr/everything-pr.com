
-- Reassign all remaining legacy bylines to Editorial Team (1052)
UPDATE public.posts
SET author_id = 1052
WHERE author_id IN (10, 11, 17, 36, 49, 51, 1184, 6380, 6464, 6689);

-- Delete legacy author rows now empty + empty zero-post profiles not in the keep roster
DELETE FROM public.authors
WHERE id IN (
  -- reassigned legacy bylines
  10, 11, 17, 36, 49, 51, 1184, 6380, 6464, 6689,
  -- empty profiles not in keep roster (keep: 5, 6, 1052, 20548, 20558, 20559, 20560, 20563, 20564)
  42, 48, 96, 1012, 20561, 20562
);

-- Recompute post_count for remaining authors
UPDATE public.authors a
SET post_count = COALESCE((SELECT COUNT(*) FROM public.posts p WHERE p.author_id = a.id AND p.status = 'publish'), 0);

-- 301 redirects for retired author URLs
INSERT INTO public.redirects (source_path, target_path, status_code, enabled, notes) VALUES
  ('/author/benito09102015/',                  '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/benito09102015',                   '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/mginsberg/',                       '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/mginsberg',                        '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/mark-ginsbergangoramedia-com/',    '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/mark-ginsbergangoramedia-com',     '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/benito/',                          '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/benito',                           '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/gabriel-paredes/',                 '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/gabriel-paredes',                  '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/theo-trapalis/',                   '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/theo-trapalis',                    '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/yorkvilleadvisors/',               '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/yorkvilleadvisors',                '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/nikkiparker/',                     '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/nikkiparker',                      '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/theentrepreneur111/',              '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/theentrepreneur111',               '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/lax-studio/',                      '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/lax-studio',                       '/author/editorial-team', 301, true, 'Merged into Editorial Team'),
  ('/author/salsiino/',                        '/authors', 301, true, 'Retired profile'),
  ('/author/salsiino',                         '/authors', 301, true, 'Retired profile'),
  ('/author/guestauthor/',                     '/authors', 301, true, 'Retired profile'),
  ('/author/guestauthor',                      '/authors', 301, true, 'Retired profile'),
  ('/author/samantha-mignacca/',               '/authors', 301, true, 'Retired profile'),
  ('/author/samantha-mignacca',                '/authors', 301, true, 'Retired profile'),
  ('/author/davidmilberg/',                    '/authors', 301, true, 'Retired profile'),
  ('/author/davidmilberg',                     '/authors', 301, true, 'Retired profile'),
  ('/author/curium/',                          '/authors', 301, true, 'Retired profile'),
  ('/author/curium',                           '/authors', 301, true, 'Retired profile'),
  ('/author/eduard-moraru/',                   '/authors', 301, true, 'Retired profile'),
  ('/author/eduard-moraru',                    '/authors', 301, true, 'Retired profile')
ON CONFLICT DO NOTHING;
