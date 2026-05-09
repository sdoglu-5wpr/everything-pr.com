
-- Merge 7 duplicate category pairs + RPC for the admin tool
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Generic merge function: moves post associations, creates 301, rewrites
-- inline links, deletes loser, recomputes post_count, logs to activity_log.
CREATE OR REPLACE FUNCTION public.merge_categories(p_winner_id bigint, p_loser_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner record;
  v_loser  record;
  v_moved int := 0;
  v_html_updated int := 0;
BEGIN
  IF p_winner_id = p_loser_id THEN
    RAISE EXCEPTION 'winner and loser must differ';
  END IF;
  SELECT * INTO v_winner FROM categories WHERE id = p_winner_id;
  SELECT * INTO v_loser  FROM categories WHERE id = p_loser_id;
  IF v_winner.id IS NULL OR v_loser.id IS NULL THEN
    RAISE EXCEPTION 'category not found';
  END IF;

  -- 1) Move post_categories rows that don't already exist on winner
  WITH moved AS (
    UPDATE post_categories pc
       SET category_id = v_winner.id
     WHERE pc.category_id = v_loser.id
       AND NOT EXISTS (
         SELECT 1 FROM post_categories pc2
          WHERE pc2.post_id = pc.post_id AND pc2.category_id = v_winner.id
       )
    RETURNING 1
  )
  SELECT count(*) INTO v_moved FROM moved;

  -- 2) Drop any leftover loser associations (dupes already on winner)
  DELETE FROM post_categories WHERE category_id = v_loser.id;

  -- 3) 301 redirect
  INSERT INTO redirects (source_path, target_path, status_code, enabled, notes)
  VALUES ('/' || v_loser.slug || '/', '/' || v_winner.slug || '/', 301, true,
          'category merge: ' || v_loser.slug || ' -> ' || v_winner.slug)
  ON CONFLICT (source_path) DO UPDATE
    SET target_path = EXCLUDED.target_path,
        status_code = 301, enabled = true, updated_at = now();

  -- 4) Rewrite inline content links (relative + absolute)
  WITH upd AS (
    UPDATE posts
       SET content_html = replace(
             replace(content_html,
               'href="https://everything-pr.com/' || v_loser.slug || '/',
               'href="https://everything-pr.com/' || v_winner.slug || '/'),
             'href="/' || v_loser.slug || '/',
             'href="/' || v_winner.slug || '/'),
           updated_at = now()
     WHERE content_html LIKE '%' || v_loser.slug || '/%'
    RETURNING 1
  )
  SELECT count(*) INTO v_html_updated FROM upd;

  -- 5) Delete loser category
  DELETE FROM categories WHERE id = v_loser.id;

  -- 6) Recompute winner post_count
  UPDATE categories
     SET post_count = (SELECT count(*) FROM post_categories WHERE category_id = v_winner.id),
         updated_at = now()
   WHERE id = v_winner.id;

  -- 7) Audit
  INSERT INTO activity_log (actor_id, table_name, row_id, action, diff)
  VALUES (auth.uid(), 'categories', v_loser.id::text, 'merge_category',
          jsonb_build_object(
            'winner', jsonb_build_object('id', v_winner.id, 'slug', v_winner.slug, 'name', v_winner.name),
            'loser',  jsonb_build_object('id', v_loser.id,  'slug', v_loser.slug,  'name', v_loser.name),
            'posts_moved', v_moved,
            'posts_html_updated', v_html_updated
          ));

  RETURN jsonb_build_object(
    'ok', true,
    'winner_slug', v_winner.slug,
    'loser_slug', v_loser.slug,
    'posts_moved', v_moved,
    'posts_html_updated', v_html_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_categories(bigint, bigint) FROM PUBLIC, anon, authenticated;

-- Run the 7 confirmed merges
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ARRAY['cannabis','cannabis-pr'],
    ARRAY['cpg','cpg-pr'],
    ARRAY['beauty','beauty-pr'],
    ARRAY['financial-services','financial-services-pr'],
    ARRAY['health-tech','health-tech-pr'],
    ARRAY['university-pr','university-pr-2'],
    ARRAY['adtech-pr','adtech']
  ];
  p text[];
  w_id bigint;
  l_id bigint;
BEGIN
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    SELECT id INTO w_id FROM categories WHERE slug = p[1];
    SELECT id INTO l_id FROM categories WHERE slug = p[2];
    IF w_id IS NOT NULL AND l_id IS NOT NULL THEN
      PERFORM public.merge_categories(w_id, l_id);
    END IF;
  END LOOP;
END $$;
