
CREATE INDEX IF NOT EXISTS media_backfill_queue_storage_key_done_idx
  ON public.media_backfill_queue (storage_key)
  WHERE status = 'done';

-- Set-based: rewrite seo_meta og/twitter using variant mapping in ONE query each.
CREATE OR REPLACE FUNCTION public.rewrite_seo_meta_variants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_og int := 0; v_tw int := 0; v_base text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  WITH cand AS (
    SELECT id, og_image,
           'wp-content/uploads/' ||
             regexp_replace(
               substring(og_image FROM '/wp-content/uploads/(.+)$'),
               '-\d+x\d+(\.[A-Za-z0-9]+)$', '\1'
             ) AS orig_key
    FROM seo_meta
    WHERE og_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE seo_meta s
    SET og_image = v_base || '/storage/v1/object/public/wp-media/' || q.storage_key,
        updated_at = now()
    FROM cand c
    JOIN media_backfill_queue q ON q.storage_key = c.orig_key AND q.status = 'done'
    WHERE s.id = c.id
    RETURNING 1
  )
  SELECT count(*) INTO v_og FROM upd;

  WITH cand AS (
    SELECT id, twitter_image,
           'wp-content/uploads/' ||
             regexp_replace(
               substring(twitter_image FROM '/wp-content/uploads/(.+)$'),
               '-\d+x\d+(\.[A-Za-z0-9]+)$', '\1'
             ) AS orig_key
    FROM seo_meta
    WHERE twitter_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE seo_meta s
    SET twitter_image = v_base || '/storage/v1/object/public/wp-media/' || q.storage_key,
        updated_at = now()
    FROM cand c
    JOIN media_backfill_queue q ON q.storage_key = c.orig_key AND q.status = 'done'
    WHERE s.id = c.id
    RETURNING 1
  )
  SELECT count(*) INTO v_tw FROM upd;

  RETURN jsonb_build_object('og_updated', v_og, 'tw_updated', v_tw);
END $$;

-- Set-based: rewrite first_inline_image
CREATE OR REPLACE FUNCTION public.rewrite_posts_inline_variants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_n int := 0; v_base text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  WITH cand AS (
    SELECT id,
           'wp-content/uploads/' ||
             regexp_replace(
               substring(first_inline_image FROM '/wp-content/uploads/(.+)$'),
               '-\d+x\d+(\.[A-Za-z0-9]+)$', '\1'
             ) AS orig_key
    FROM posts
    WHERE first_inline_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE posts p
    SET first_inline_image = v_base || '/storage/v1/object/public/wp-media/' || q.storage_key,
        updated_at = now()
    FROM cand c
    JOIN media_backfill_queue q ON q.storage_key = c.orig_key AND q.status = 'done'
    WHERE p.id = c.id
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  RETURN jsonb_build_object('inline_updated', v_n);
END $$;

-- Per-post html chunk: now uses joined set-based per-URL replacement instead of
-- per-URL plpgsql function call.
CREATE OR REPLACE FUNCTION public.rewrite_posts_html_variants_chunk(p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_base text;
  v_updated int := 0;
  v_skipped int := 0;
  v_remaining int := 0;
  rec record;
  pair record;
  new_html text;
BEGIN
  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN jsonb_build_object('error','no_base'); END IF;

  FOR rec IN
    SELECT id, content_html FROM posts
    WHERE content_html LIKE '%everything-pr.com/wp-content/uploads/%'
    ORDER BY id
    LIMIT p_limit
  LOOP
    new_html := rec.content_html;
    -- Build per-post (legacy_url, new_url) pairs in one set-based query
    FOR pair IN
      WITH urls AS (
        SELECT DISTINCT regexp_replace(m[1], '[)\].,;:!?"'']+$', '') AS u
        FROM regexp_matches(
          rec.content_html,
          'https?://(?:www\.)?everything-pr\.com/wp-content/uploads/[^\s"''<>)\]]+',
          'gi'
        ) AS m
      ),
      keyed AS (
        SELECT u,
               'wp-content/uploads/' ||
                 regexp_replace(
                   substring(u FROM '/wp-content/uploads/(.+)$'),
                   '-\d+x\d+(\.[A-Za-z0-9]+)$', '\1'
                 ) AS orig_key
        FROM urls
      )
      SELECT k.u AS old_url,
             v_base || '/storage/v1/object/public/wp-media/' || q.storage_key AS new_url
      FROM keyed k
      JOIN media_backfill_queue q
        ON q.storage_key = k.orig_key AND q.status = 'done'
    LOOP
      new_html := replace(new_html, pair.old_url, pair.new_url);
    END LOOP;

    IF new_html IS DISTINCT FROM rec.content_html THEN
      UPDATE posts SET content_html = new_html, updated_at = now() WHERE id = rec.id;
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_remaining FROM posts
  WHERE content_html LIKE '%everything-pr.com/wp-content/uploads/%';

  RETURN jsonb_build_object('updated', v_updated, 'skipped_no_map', v_skipped, 'remaining', v_remaining);
END $$;
