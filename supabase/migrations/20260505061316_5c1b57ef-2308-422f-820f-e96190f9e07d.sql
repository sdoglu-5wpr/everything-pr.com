
-- =========================
-- automations
-- =========================
CREATE TABLE public.automations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'cron', -- cron | webhook | event
  schedule TEXT,                              -- cron expression when trigger_type='cron'
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,                           -- success | error | running | null
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read automations" ON public.automations FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write automations" ON public.automations FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_automations_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the 12 automations from § 20.5
INSERT INTO public.automations (name, description, trigger_type, schedule, enabled, config) VALUES
  ('publish-on-schedule',  'Promote scheduled posts to published when published_at <= now()', 'cron', '* * * * *',     true,  '{}'),
  ('sitemap-regen',        'Regenerate sitemap_index.xml and per-type sitemaps',              'cron', '0 */6 * * *',   true,  '{}'),
  ('deploy-hook',          'Trigger downstream static rebuild via webhook',                    'event','',              false, '{"url":""}'),
  ('internal-link-suggest','Suggest internal links for new/updated posts',                    'cron', '0 3 * * *',     true,  '{}'),
  ('daily-digest',         'Email staff a daily content + traffic digest',                    'cron', '0 8 * * *',     false, '{}'),
  ('auto-tweet',           'Auto-post new articles to X/Twitter',                              'event','',              false, '{}'),
  ('image-optimize',       'Generate webp/avif/thumb variants for new media',                  'event','',              false, '{}'),
  ('broken-link-scan',     'Crawl published posts for broken outbound links',                  'cron', '0 4 * * 1',     true,  '{}'),
  ('404-catcher',          'Aggregate analytics_404 hits into redirect suggestions',           'cron', '0 5 * * *',     true,  '{}'),
  ('sponsored-audit',      'Flag sponsored posts missing rel=sponsored on outbound links',     'cron', '0 6 * * *',     true,  '{}'),
  ('seo-precompute',       'Pre-compute seo_meta JSON-LD + breadcrumbs for posts',             'cron', '0 2 * * *',     true,  '{}'),
  ('static-rebuild',       'Trigger ISR/static rebuild after content changes',                 'event','',              false, '{}');

-- =========================
-- activity_log
-- =========================
CREATE TABLE public.activity_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  table_name TEXT NOT NULL,
  row_id TEXT,
  action TEXT NOT NULL,        -- INSERT | UPDATE | DELETE
  diff JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_occurred_at ON public.activity_log (occurred_at DESC);
CREATE INDEX idx_activity_log_table_row ON public.activity_log (table_name, row_id);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read activity_log" ON public.activity_log FOR SELECT USING (public.is_staff(auth.uid()));
-- writes only via trigger (security definer); no insert policy needed for direct API use
CREATE POLICY "staff write activity_log" ON public.activity_log FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.write_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id TEXT;
  v_diff JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row_id := COALESCE((to_jsonb(OLD)->>'id'), '');
    v_diff := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_row_id := COALESCE((to_jsonb(NEW)->>'id'), '');
    v_diff := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_row_id := COALESCE((to_jsonb(NEW)->>'id'), '');
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.activity_log (actor_id, table_name, row_id, action, diff)
  VALUES (auth.uid(), TG_TABLE_NAME, v_row_id, TG_OP, v_diff);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_audit_posts          AFTER INSERT OR UPDATE OR DELETE ON public.posts          FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
CREATE TRIGGER trg_audit_redirects      AFTER INSERT OR UPDATE OR DELETE ON public.redirects      FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
CREATE TRIGGER trg_audit_menus          AFTER INSERT OR UPDATE OR DELETE ON public.menus          FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
CREATE TRIGGER trg_audit_site_settings  AFTER INSERT OR UPDATE OR DELETE ON public.site_settings  FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
CREATE TRIGGER trg_audit_user_roles     AFTER INSERT OR UPDATE OR DELETE ON public.user_roles     FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
-- pages live in posts (type='page'); same trigger covers them.

-- =========================
-- post_revisions
-- =========================
CREATE TABLE public.post_revisions (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  author_id UUID,
  title TEXT,
  excerpt TEXT,
  content_html TEXT,
  content_text TEXT,
  kind TEXT NOT NULL DEFAULT 'autosave', -- autosave | manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_revisions_post_id_created ON public.post_revisions (post_id, created_at DESC);
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read post_revisions"  ON public.post_revisions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write post_revisions" ON public.post_revisions FOR ALL    USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- analytics_404
-- =========================
CREATE TABLE public.analytics_404 (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  hit_count INTEGER NOT NULL DEFAULT 1,
  first_hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (path)
);
CREATE INDEX idx_analytics_404_last_hit ON public.analytics_404 (last_hit_at DESC);
ALTER TABLE public.analytics_404 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read analytics_404"  ON public.analytics_404 FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write analytics_404" ON public.analytics_404 FOR ALL    USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- media_variants
-- =========================
CREATE TABLE public.media_variants (
  id BIGSERIAL PRIMARY KEY,
  media_id BIGINT NOT NULL,
  kind TEXT NOT NULL,        -- thumb | medium | large | webp | avif | original
  width INTEGER,
  height INTEGER,
  url TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  filesize BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, kind)
);
CREATE INDEX idx_media_variants_media_id ON public.media_variants (media_id);
ALTER TABLE public.media_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read media_variants" ON public.media_variants FOR SELECT USING (true);
CREATE POLICY "staff write media_variants" ON public.media_variants FOR ALL    USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
