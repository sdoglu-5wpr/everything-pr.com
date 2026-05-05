-- =========================================================
-- Everything-PR migration: Phase 1 content schema
-- =========================================================

-- ---------- Roles (admin gate) ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'author');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'editor', 'author')
  )
$$;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- Authors ----------
CREATE TABLE public.authors (
  id bigint PRIMARY KEY,                       -- legacy WP user_id
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text,
  bio text,
  avatar_url text,
  website text,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_authors_updated BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Categories ----------
CREATE TABLE public.categories (
  id bigint PRIMARY KEY,                       -- legacy WP term_id
  parent_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  post_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Tags ----------
CREATE TABLE public.tags (
  id bigint PRIMARY KEY,                       -- legacy WP term_id
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  post_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Media (attachments) ----------
CREATE TABLE public.media (
  id bigint PRIMARY KEY,                       -- legacy WP attachment ID
  url text NOT NULL,                           -- original WP URL (/wp-content/uploads/...)
  storage_path text,                           -- future Supabase Storage path
  filename text,
  mime_type text,
  width integer,
  height integer,
  filesize bigint,
  alt_text text,
  caption text,
  title text,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_url ON public.media(url);
CREATE TRIGGER trg_media_updated BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Posts ----------
CREATE TYPE public.post_status   AS ENUM ('publish','draft','pending','private','future','trash');
CREATE TYPE public.content_type  AS ENUM ('post','page');

CREATE TABLE public.posts (
  id bigint PRIMARY KEY,                       -- legacy WP post ID
  type public.content_type NOT NULL DEFAULT 'post',
  status public.post_status NOT NULL DEFAULT 'publish',
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content_html text NOT NULL DEFAULT '',
  content_text text,                           -- plain text for FTS / search
  author_id bigint REFERENCES public.authors(id) ON DELETE SET NULL,
  featured_media_id bigint REFERENCES public.media(id) ON DELETE SET NULL,
  parent_id bigint REFERENCES public.posts(id) ON DELETE SET NULL,
  menu_order integer NOT NULL DEFAULT 0,
  comment_status text NOT NULL DEFAULT 'closed',
  password text,
  published_at timestamptz,
  modified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector,
  UNIQUE (type, slug)
);
CREATE INDEX idx_posts_status_published ON public.posts(status, published_at DESC);
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_type ON public.posts(type);
CREATE INDEX idx_posts_search ON public.posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION public.posts_search_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text,'')), 'C');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_posts_search BEFORE INSERT OR UPDATE OF title, excerpt, content_text
  ON public.posts FOR EACH ROW EXECUTE FUNCTION public.posts_search_trigger();
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Post ↔ Category / Tag ----------
CREATE TABLE public.post_categories (
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
CREATE INDEX idx_post_categories_cat ON public.post_categories(category_id);

CREATE TABLE public.post_tags (
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id bigint NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag ON public.post_tags(tag_id);

-- ---------- SEO meta (per-URL Yoast/RankMath parity) ----------
CREATE TABLE public.seo_meta (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_type text NOT NULL,                   -- 'post','page','category','tag','author','home','archive'
  object_id bigint,                            -- nullable for home/archive
  url_path text NOT NULL,                      -- canonical path key, e.g. '/some-slug/'
  title text,
  description text,
  canonical_url text,
  robots text,                                 -- e.g. 'index,follow'
  og_title text,
  og_description text,
  og_image text,
  og_type text,
  twitter_card text,
  twitter_title text,
  twitter_description text,
  twitter_image text,
  schema_jsonld jsonb,
  breadcrumbs jsonb,
  raw jsonb,                                   -- full original Yoast/RankMath payload
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url_path)
);
CREATE INDEX idx_seo_object ON public.seo_meta(object_type, object_id);
CREATE TRIGGER trg_seo_updated BEFORE UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Redirects (Redirection plugin parity) ----------
CREATE TABLE public.redirects (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_path text NOT NULL UNIQUE,
  target_path text NOT NULL,
  status_code smallint NOT NULL DEFAULT 301,
  is_regex boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  hits integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_redirects_enabled ON public.redirects(enabled) WHERE enabled = true;
CREATE TRIGGER trg_redirects_updated BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Menus ----------
CREATE TABLE public.menus (
  id bigint PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  location text,                               -- 'primary','footer', etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_menus_updated BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.menu_items (
  id bigint PRIMARY KEY,
  menu_id bigint NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id bigint REFERENCES public.menu_items(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  url text NOT NULL,
  target text,                                 -- '_self','_blank'
  rel text,
  object_type text,                            -- 'post','page','category','custom'
  object_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_menu ON public.menu_items(menu_id, position);
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Internal links (graph for related-posts / link suggestions) ----------
CREATE TABLE public.internal_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  target_post_id bigint REFERENCES public.posts(id) ON DELETE SET NULL,
  anchor_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_links_source ON public.internal_links(source_post_id);
CREATE INDEX idx_internal_links_target ON public.internal_links(target_post_id);

-- ---------- Site settings ----------
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_meta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings   ENABLE ROW LEVEL SECURITY;

-- user_roles: only admins can manage; users can view their own row
CREATE POLICY "users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Public read on content tables; staff write
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'authors','categories','tags','media','menus','menu_items','site_settings'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "public read %1$s" ON public.%1$s FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "staff write %1$s" ON public.%1$s FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));', t);
  END LOOP;
END$$;

-- Posts: only published visible to public; staff see all
CREATE POLICY "public read published posts" ON public.posts
  FOR SELECT USING (status = 'publish' OR public.is_staff(auth.uid()));
CREATE POLICY "staff write posts" ON public.posts
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Junction tables: public read (filter by published happens via posts join)
CREATE POLICY "public read post_categories" ON public.post_categories
  FOR SELECT USING (true);
CREATE POLICY "staff write post_categories" ON public.post_categories
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read post_tags" ON public.post_tags
  FOR SELECT USING (true);
CREATE POLICY "staff write post_tags" ON public.post_tags
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SEO meta: public read, staff write
CREATE POLICY "public read seo" ON public.seo_meta FOR SELECT USING (true);
CREATE POLICY "staff write seo" ON public.seo_meta
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Redirects: only enabled rows public; staff manage
CREATE POLICY "public read enabled redirects" ON public.redirects
  FOR SELECT USING (enabled = true OR public.is_staff(auth.uid()));
CREATE POLICY "staff write redirects" ON public.redirects
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Internal links: staff only (internal admin tool)
CREATE POLICY "staff read internal_links" ON public.internal_links
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write internal_links" ON public.internal_links
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
