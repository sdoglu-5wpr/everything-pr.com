-- Fast: SEO og/twitter
CREATE OR REPLACE FUNCTION public.rewrite_seo_meta_legacy()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_og int := 0; v_tw int := 0; v_base text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  WITH m AS (
    SELECT url AS old_url, v_base || '/storage/v1/object/public/wp-media/' || storage_key AS new_url
    FROM media_backfill_queue WHERE status = 'done'
  ),
  u1 AS (UPDATE seo_meta s SET og_image = m.new_url, updated_at = now()
         FROM m WHERE s.og_image = m.old_url RETURNING 1)
  SELECT count(*) INTO v_og FROM u1;

  WITH m AS (
    SELECT url AS old_url, v_base || '/storage/v1/object/public/wp-media/' || storage_key AS new_url
    FROM media_backfill_queue WHERE status = 'done'
  ),
  u2 AS (UPDATE seo_meta s SET twitter_image = m.new_url, updated_at = now()
         FROM m WHERE s.twitter_image = m.old_url RETURNING 1)
  SELECT count(*) INTO v_tw FROM u2;

  RETURN jsonb_build_object('og_updated', v_og, 'tw_updated', v_tw);
END $$;

-- Fast: posts.first_inline_image
CREATE OR REPLACE FUNCTION public.rewrite_posts_inline_legacy()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_n int := 0; v_base text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  WITH m AS (
    SELECT url AS old_url, v_base || '/storage/v1/object/public/wp-media/' || storage_key AS new_url
    FROM media_backfill_queue WHERE status = 'done'
  ),
  u AS (UPDATE posts p SET first_inline_image = m.new_url, updated_at = now()
        FROM m WHERE p.first_inline_image = m.old_url RETURNING 1)
  SELECT count(*) INTO v_n FROM u;
  RETURN jsonb_build_object('inline_updated', v_n);
END $$;

-- Chunked HTML rewrite. Processes up to p_limit posts that still contain
-- legacy URLs. Returns updated count + remaining count.
CREATE OR REPLACE FUNCTION public.rewrite_posts_html_legacy_chunk(p_limit int DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_base text;
  v_updated int := 0;
  v_remaining int := 0;
  rec record;
  pair record;
  new_html text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  -- Build a tiny in-memory map (only entries whose old_url appears in any of
  -- the posts we'll touch is the goal, but the full map is small enough).
  CREATE TEMP TABLE IF NOT EXISTS _m_chunk (old_url text, new_url text) ON COMMIT DROP;
  TRUNCATE _m_chunk;
  INSERT INTO _m_chunk
  SELECT url, v_base || '/storage/v1/object/public/wp-media/' || storage_key
  FROM media_backfill_queue WHERE status = 'done';
  CREATE INDEX IF NOT EXISTS _m_chunk_idx ON _m_chunk(old_url);

  FOR rec IN
    SELECT id, content_html FROM posts
    WHERE content_html LIKE '%everything-pr.com/wp-content/uploads/%'
    ORDER BY id
    LIMIT p_limit
  LOOP
    new_html := rec.content_html;
    FOR pair IN
      SELECT old_url, new_url FROM _m_chunk
      WHERE position(old_url IN new_html) > 0
    LOOP
      new_html := replace(new_html, pair.old_url, pair.new_url);
    END LOOP;
    IF new_html IS DISTINCT FROM rec.content_html THEN
      UPDATE posts SET content_html = new_html, updated_at = now() WHERE id = rec.id;
      v_updated := v_updated + 1;
    ELSE
      -- Nothing matched in our map (URL is legacy but no migrated copy yet);
      -- skip to avoid infinite loop on next call by stripping the marker is
      -- not safe — just leave and let the client move on.
      NULL;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_remaining FROM posts
  WHERE content_html LIKE '%everything-pr.com/wp-content/uploads/%';

  RETURN jsonb_build_object('updated', v_updated, 'remaining', v_remaining);
END $$;