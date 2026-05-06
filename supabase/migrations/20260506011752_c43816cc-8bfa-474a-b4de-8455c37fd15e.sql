
INSERT INTO public.media (id, url, mime_type, width, height, alt_text, title) VALUES
(900001, '/research/pr-spend-transparency-study-2026.svg', 'image/svg+xml', 1200, 630, 'PR Spend Transparency Study 2026', 'PR Spend Transparency Study 2026'),
(900002, '/research/nonprofit-pr-transparency-study-2026.svg', 'image/svg+xml', 1200, 630, 'The Nonprofit PR Transparency Study 2026', 'Nonprofit PR Transparency Study 2026'),
(900003, '/research/municipal-state-pr-spend-study-2026.svg', 'image/svg+xml', 1200, 630, 'The Municipal & State PR Spend Study 2026', 'Municipal & State PR Spend Study 2026'),
(900004, '/research/ai-company-comms-study-2026.svg', 'image/svg+xml', 1200, 630, 'The AI Company Comms Study 2026', 'AI Company Comms Study 2026'),
(900005, '/research/the-foreign-influence-pr-study-2026.svg', 'image/svg+xml', 1200, 630, 'The Foreign Influence PR Study 2026', 'Foreign Influence PR Study 2026');

UPDATE public.posts SET featured_media_id = 900001 WHERE id = 111950;
UPDATE public.posts SET featured_media_id = 900002 WHERE id = 112135;
UPDATE public.posts SET featured_media_id = 900003 WHERE id = 112138;
UPDATE public.posts SET featured_media_id = 900004 WHERE id = 112140;
UPDATE public.posts SET featured_media_id = 900005 WHERE id = 112012;

UPDATE public.seo_meta SET og_image = '/research/pr-spend-transparency-study-2026.svg', twitter_image = '/research/pr-spend-transparency-study-2026.svg' WHERE object_type='post' AND object_id = 111950;
UPDATE public.seo_meta SET og_image = '/research/nonprofit-pr-transparency-study-2026.svg', twitter_image = '/research/nonprofit-pr-transparency-study-2026.svg' WHERE object_type='post' AND object_id = 112135;
UPDATE public.seo_meta SET og_image = '/research/municipal-state-pr-spend-study-2026.svg', twitter_image = '/research/municipal-state-pr-spend-study-2026.svg' WHERE object_type='post' AND object_id = 112138;
UPDATE public.seo_meta SET og_image = '/research/ai-company-comms-study-2026.svg', twitter_image = '/research/ai-company-comms-study-2026.svg' WHERE object_type='post' AND object_id = 112140;
UPDATE public.seo_meta SET og_image = '/research/the-foreign-influence-pr-study-2026.svg', twitter_image = '/research/the-foreign-influence-pr-study-2026.svg' WHERE object_type='post' AND object_id = 112012;
