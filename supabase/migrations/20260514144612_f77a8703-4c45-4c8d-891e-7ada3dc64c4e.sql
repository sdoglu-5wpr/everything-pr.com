ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS article_type text,
  ADD COLUMN IF NOT EXISTS pillar_slug text,
  ADD COLUMN IF NOT EXISTS pillar_index integer;

CREATE INDEX IF NOT EXISTS idx_posts_pillar
  ON public.posts (pillar_slug, pillar_index)
  WHERE article_type = 'pillar';