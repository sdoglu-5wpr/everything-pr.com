CREATE OR REPLACE FUNCTION public.get_homepage_data(p_section_slugs text[] DEFAULT ARRAY['pr-news'::text, 'pr-insights'::text, 'marketing'::text, 'social-media'::text], p_crisis_slug text DEFAULT 'crisis-pr'::text, p_economy_slug text DEFAULT 'corporate-pr'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with latest as materialized (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           p.first_inline_image as content_html,
           m.url as media_url,
           s.og_image,
           jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug, 'avatar_url', a.avatar_url) as author,
           cat.category
    from public.posts p
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
    left join lateral (
      select jsonb_build_object('name', c.name, 'slug', c.slug) as category
      from public.post_categories pc
      join public.categories c on c.id = pc.category_id
      where pc.post_id = p.id
      limit 1
    ) cat on true
    where p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
    limit 24
  ),
  section_posts as (
    select ss.section_slug, x.*
    from unnest(p_section_slugs) as ss(section_slug)
    join public.categories sc on sc.slug = ss.section_slug
    cross join lateral (
      select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
             p.first_inline_image as content_html,
             m.url as media_url,
             s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug, 'avatar_url', a.avatar_url) as author,
             jsonb_build_object('name', sc.name, 'slug', sc.slug) as category
      from public.post_categories pc
      join public.posts p on p.id = pc.post_id
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      where pc.category_id = sc.id
        and p.type = 'post' and p.status = 'publish'
        and not exists (select 1 from latest l where l.id = p.id)
      order by p.published_at desc nulls last
      limit 6
    ) x
  ),
  crisis_posts as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           p.first_inline_image as content_html,
           m.url as media_url,
           s.og_image,
           jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug, 'avatar_url', a.avatar_url) as author,
           jsonb_build_object('name', c.name, 'slug', c.slug) as category
    from public.categories c
    join public.post_categories pc on pc.category_id = c.id
    join public.posts p on p.id = pc.post_id
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
    where c.slug = p_crisis_slug and p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
    limit 7
  ),
  economy_post as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           p.first_inline_image as content_html,
           m.url as media_url,
           s.og_image,
           jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug, 'avatar_url', a.avatar_url) as author,
           jsonb_build_object('name', c.name, 'slug', c.slug) as category
    from public.categories c
    join public.post_categories pc on pc.category_id = c.id
    join public.posts p on p.id = pc.post_id
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
    where c.slug = p_economy_slug and p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
    limit 1
  ),
  top_authors_q as (
    select id, display_name, slug, avatar_url, bio, post_count
    from public.authors
    order by post_count desc nulls last
    limit 50
  ),
  footer as (
    select mi.label, mi.url, mi.position
    from public.menus mn
    join public.menu_items mi on mi.menu_id = mn.id
    where mn.slug = 'menu-2'
    order by mi.position
  )
  select jsonb_build_object(
    'latest', coalesce((select jsonb_agg(to_jsonb(l) order by l.published_at desc nulls last) from latest l), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_object_agg(section_slug, posts)
      from (
        select section_slug, jsonb_agg(to_jsonb(sp) order by sp.published_at desc nulls last) as posts
        from section_posts sp
        group by section_slug
      ) grouped
    ), '{}'::jsonb),
    'crisis', coalesce((select jsonb_agg(to_jsonb(cp) order by cp.published_at desc nulls last) from crisis_posts cp), '[]'::jsonb),
    'economy', (select to_jsonb(ep) from economy_post ep limit 1),
    'top_authors', coalesce((select jsonb_agg(to_jsonb(ta) order by ta.post_count desc nulls last) from top_authors_q ta), '[]'::jsonb),
    'footer_menu', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'url', url) order by position) from footer), '[]'::jsonb)
  );
$function$;