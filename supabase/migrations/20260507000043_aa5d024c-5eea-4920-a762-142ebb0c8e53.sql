
-- Smart variant remap: for legacy URLs like ".../foo-300x200.jpg" map to
-- the migrated original ".../foo.jpg" (Supabase URL) using media_backfill_queue.

CREATE OR REPLACE FUNCTION public.legacy_to_supabase_url(p_legacy text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_storage_key text;
  v_orig_key text;
  v_new text;
BEGIN
  IF p_legacy IS NULL OR p_legacy = '' THEN RETURN NULL; END IF;

  SELECT split_part(url, '/storage/v1/', 1) INTO v_base
  FROM media WHERE url LIKE '%/storage/v1/object/public/wp-media/%' LIMIT 1;
  IF v_base IS NULL THEN RETURN NULL; END IF;

  -- Exact match first
  SELECT storage_key INTO v_storage_key
  FROM media_backfill_queue WHERE url = p_legacy AND status = 'done' LIMIT 1;
  IF v_storage_key IS NOT NULL THEN
    RETURN v_base || '/storage/v1/object/public/wp-media/' || v_storage_key;
  END IF;

  -- Strip "-WIDTHxHEIGHT" before extension and try again
  v_orig_key := 'wp-content/uploads/' ||
                regexp_replace(
                  substring(p_legacy FROM '/wp-content/uploads/(.+)$'),
                  '-\d+x\d+(\.[A-Za-z0-9]+)$', '\1'
                );

  SELECT storage_key INTO v_storage_key
  FROM media_backfill_queue
  WHERE storage_key = v_orig_key AND status = 'done'
  LIMIT 1;

  IF v_storage_key IS NOT NULL THEN
    RETURN v_base || '/storage/v1/object/public/wp-media/' || v_storage_key;
  END IF;

  RETURN NULL;
END $$;

-- Rewrite content_html for posts using variant mapping (chunked)
CREATE OR REPLACE FUNCTION public.rewrite_posts_html_variants_chunk(p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  v_updated int := 0;
  v_remaining int := 0;
  v_skipped int := 0;
  rec record;
  url_rec record;
  new_html text;
  mapped text;
BEGIN
  FOR rec IN
    SELECT id, content_html FROM posts
    WHERE content_html LIKE '%everything-pr.com/wp-content/uploads/%'
    ORDER BY id
    LIMIT p_limit
  LOOP
    new_html := rec.content_html;
    FOR url_rec IN
      SELECT DISTINCT regexp_replace(m[1], '[)\].,;:!?"'']+$', '') AS u
      FROM regexp_matches(
        rec.content_html,
        'https?://(?:www\.)?everything-pr\.com/wp-content/uploads/[^\s"''<>)\]]+',
        'gi'
      ) AS m
    LOOP
      mapped := public.legacy_to_supabase_url(url_rec.u);
      IF mapped IS NOT NULL THEN
        new_html := replace(new_html, url_rec.u, mapped);
      END IF;
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

-- Rewrite first_inline_image using variant mapping
CREATE OR REPLACE FUNCTION public.rewrite_posts_inline_variants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_n int := 0;
BEGIN
  WITH cand AS (
    SELECT id, first_inline_image AS old_url,
           public.legacy_to_supabase_url(first_inline_image) AS new_url
    FROM posts
    WHERE first_inline_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE posts p SET first_inline_image = c.new_url, updated_at = now()
    FROM cand c WHERE p.id = c.id AND c.new_url IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  RETURN jsonb_build_object('inline_updated', v_n);
END $$;

-- Rewrite seo_meta og/twitter using variant mapping
CREATE OR REPLACE FUNCTION public.rewrite_seo_meta_variants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE v_og int := 0; v_tw int := 0;
BEGIN
  WITH cand AS (
    SELECT id, og_image AS old_url, public.legacy_to_supabase_url(og_image) AS new_url
    FROM seo_meta WHERE og_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE seo_meta s SET og_image = c.new_url, updated_at = now()
    FROM cand c WHERE s.id = c.id AND c.new_url IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_og FROM upd;

  WITH cand AS (
    SELECT id, twitter_image AS old_url, public.legacy_to_supabase_url(twitter_image) AS new_url
    FROM seo_meta WHERE twitter_image LIKE '%everything-pr.com/wp-content/uploads/%'
  ),
  upd AS (
    UPDATE seo_meta s SET twitter_image = c.new_url, updated_at = now()
    FROM cand c WHERE s.id = c.id AND c.new_url IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_tw FROM upd;

  RETURN jsonb_build_object('og_updated', v_og, 'tw_updated', v_tw);
END $$;
