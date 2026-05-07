UPDATE public.seo_meta SET title = NULL WHERE title ~ '%%[^%]+%%';
UPDATE public.seo_meta SET description = NULL WHERE description ~ '%%[^%]+%%';
UPDATE public.seo_meta SET og_title = NULL WHERE og_title ~ '%%[^%]+%%';
UPDATE public.seo_meta SET og_description = NULL WHERE og_description ~ '%%[^%]+%%';
UPDATE public.seo_meta SET twitter_title = NULL WHERE twitter_title ~ '%%[^%]+%%';
UPDATE public.seo_meta SET twitter_description = NULL WHERE twitter_description ~ '%%[^%]+%%';