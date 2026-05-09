UPDATE public.posts
SET published_at = LEAST(COALESCE(modified_at, created_at), now())
WHERE status = 'publish' AND published_at IS NULL;