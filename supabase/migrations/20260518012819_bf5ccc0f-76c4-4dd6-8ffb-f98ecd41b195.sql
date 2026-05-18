
INSERT INTO public.authors (id, slug, display_name, post_count, social, knows_about, tags)
VALUES
  (20561, 'curium',        'Curium',        0, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb),
  (20562, 'eduard-moraru', 'Eduard Moraru', 0, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.redirects
WHERE source_path IN (
  '/author/curium/', '/author/curium',
  '/author/eduard-moraru/', '/author/eduard-moraru'
);
