-- Partial index over posts that still contain a legacy everything-pr.com image URL.
-- Drops to ~zero rows once the rewrite finishes, which makes the rewrite scan
-- effectively instant (vs. a full sequential scan of all posts every batch).
CREATE INDEX IF NOT EXISTS posts_legacy_html_idx
  ON public.posts (id)
  WHERE content_html ILIKE '%everything-pr.com/wp-content/uploads/%';

CREATE INDEX IF NOT EXISTS posts_legacy_inline_idx
  ON public.posts (id)
  WHERE first_inline_image ILIKE '%everything-pr.com/wp-content/uploads/%';