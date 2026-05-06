INSERT INTO public.redirects (source_path, target_path, status_code, enabled, notes)
VALUES
  ('/news', '/pr-news', 301, true, 'Legacy news category alias'),
  ('/news/', '/pr-news', 301, true, 'Legacy news category alias'),
  ('/features', '/featured', 301, true, 'Features alias to Featured PR & Marketing Coverage'),
  ('/features/', '/featured', 301, true, 'Features alias to Featured PR & Marketing Coverage'),
  ('/category/news', '/pr-news', 301, true, 'Legacy news category alias'),
  ('/category/features', '/featured', 301, true, 'Features alias')
ON CONFLICT (source_path) DO UPDATE SET target_path = EXCLUDED.target_path, enabled = true;