create or replace function public.get_homepage(
  p_economy_slug text default 'corporate-pr'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
  with latest as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.first_inline_image,
           m.url as featured_image_url,
           a.display_name as author_name, a.slug as author_slug,
           (select jsonb_build_object('name', c.name, 'slug', c.slug)
              from public.post_categories pc
              join public.categories c on c.id = pc.category_id
              where pc.post_id = p.id
              order by c.id asc limit 1) as category
    from public.posts p
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    where p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
    limit 30
  ),
  section_posts as (
    select c.slug as section_slug, p.id, p.slug, p.title, p.excerpt, p.published_at, p.first_inline_image,
           m.url as featured_image_url,
           a.display_name as author_name, a.slug as author_slug,
           jsonb_build_object('name', c.name, 'slug', c.slug) as category
    from public.categories c
    join public.post_categories pc on pc.category_id = c.id
    join public.posts p on p.id = pc.post_id
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    where c.slug in ('pr-news','pr-insights','marketing','social-media')
      and p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
  ),
  crisis_posts as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.first_inline_image,
           m.url as featured_image_url,
           a.display_name as author_name, a.slug as author_slug,
           jsonb_build_object('name', c.name, 'slug', c.slug) as category
    from public.categories c
    join public.post_categories pc on pc.category_id = c.id
    join public.posts p on p.id = pc.post_id
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    where c.slug = 'crisis-pr' and p.type = 'post' and p.status = 'publish'
    order by p.published_at desc nulls last
    limit 6
  ),
  economy_post as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.first_inline_image,
           m.url as featured_image_url,
           a.display_name as author_name, a.slug as author_slug,
           jsonb_build_object('name', c.name, 'slug', c.slug) as category,
           s.title as seo_title, s.description as seo_description, s.og_image
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
    limit 30
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