
-- ============================================================================
-- get_article_full(slug) — add og_image to top_stories / other_news rows
-- ============================================================================
create or replace function public.get_article_full(slug_param text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post posts%rowtype;
  v_result jsonb;
begin
  select * into v_post
  from posts
  where slug = slug_param
    and status = 'publish'
    and type in ('post','page')
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'post', jsonb_build_object(
      'id', v_post.id, 'slug', v_post.slug, 'title', v_post.title,
      'excerpt', v_post.excerpt, 'content_html', v_post.content_html,
      'published_at', v_post.published_at, 'modified_at', v_post.modified_at,
      'type', v_post.type, 'status', v_post.status,
      'author_id', v_post.author_id, 'featured_media_id', v_post.featured_media_id
    ),
    'author', (
      select jsonb_build_object('id', a.id, 'display_name', a.display_name,
                                'slug', a.slug, 'avatar_url', a.avatar_url, 'bio', a.bio)
      from authors a where a.id = v_post.author_id
    ),
    'featured_media', (
      select jsonb_build_object('url', m.url, 'alt_text', m.alt_text)
      from media m where m.id = v_post.featured_media_id
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
      from post_categories pc join categories c on c.id = pc.category_id
      where pc.post_id = v_post.id
    ), '[]'::jsonb),
    'seo', (
      select jsonb_build_object('title', s.title, 'description', s.description,
        'canonical_url', s.canonical_url, 'og_title', s.og_title,
        'og_description', s.og_description, 'og_image', s.og_image, 'robots', s.robots)
      from seo_meta s where s.object_type='post' and s.object_id = v_post.id limit 1
    ),
    'top_stories', coalesce((
      select jsonb_agg(t order by t.published_at desc nulls last)
      from (
        select p.id, p.slug, p.title, p.excerpt, p.published_at,
               substring(p.content_html for 1500) as content_html,
               m.url as media_url,
               (select s2.og_image from seo_meta s2
                where s2.object_type='post' and s2.object_id=p.id limit 1) as og_image,
               jsonb_build_object('display_name', a.display_name) as author,
               (select jsonb_build_object('name', c.name, 'slug', c.slug)
                from post_categories pc join categories c on c.id = pc.category_id
                where pc.post_id = p.id limit 1) as category
        from posts p
        left join media m on m.id = p.featured_media_id
        left join authors a on a.id = p.author_id
        where p.type='post' and p.status='publish' and p.id <> v_post.id
        order by p.published_at desc nulls last
        limit 5
      ) t
    ), '[]'::jsonb),
    'other_news', coalesce((
      select jsonb_agg(t order by t.published_at desc nulls last)
      from (
        select p.id, p.slug, p.title, p.excerpt, p.published_at,
               substring(p.content_html for 1500) as content_html,
               m.url as media_url,
               (select s2.og_image from seo_meta s2
                where s2.object_type='post' and s2.object_id=p.id limit 1) as og_image,
               jsonb_build_object('display_name', a.display_name) as author,
               (select jsonb_build_object('name', c.name, 'slug', c.slug)
                from post_categories pc join categories c on c.id = pc.category_id
                where pc.post_id = p.id limit 1) as category
        from posts p
        left join media m on m.id = p.featured_media_id
        left join authors a on a.id = p.author_id
        where p.type='post' and p.status='publish' and p.id <> v_post.id
        order by p.published_at desc nulls last
        offset 5 limit 3
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- get_homepage_data — add og_image to each card row
-- ============================================================================
create or replace function public.get_homepage_data(
  p_section_slugs text[] default array['pr-news','pr-insights','marketing','social-media'],
  p_crisis_slug   text   default 'crisis-pr',
  p_economy_slug  text   default 'corporate-pr'
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with latest as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at,
           p.featured_media_id, p.author_id,
           substring(p.content_html for 1500) as content_html
    from posts p
    where p.type='post' and p.status='publish'
    order by p.published_at desc nulls last
    limit 20
  ),
  latest_enriched as (
    select l.*,
      m.url as media_url,
      (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=l.id limit 1) as og_image,
      jsonb_build_object('id', a.id, 'display_name', a.display_name,
                         'slug', a.slug, 'avatar_url', a.avatar_url) as author,
      (select jsonb_build_object('name', c.name, 'slug', c.slug)
       from post_categories pc join categories c on c.id=pc.category_id
       where pc.post_id = l.id limit 1) as category
    from latest l
    left join media m on m.id = l.featured_media_id
    left join authors a on a.id = l.author_id
  ),
  hero_ids as (select id from latest order by published_at desc nulls last limit 5),
  section_posts as (
    select ss as section_slug,
           sp.id, sp.slug, sp.title, sp.excerpt, sp.published_at,
           sp.media_url, sp.og_image, sp.author, sp.content_html,
           jsonb_build_object('name', sc.name, 'slug', sc.slug) as category
    from unnest(p_section_slugs) ss
    join categories sc on sc.slug = ss
    cross join lateral (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url,
             (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name,
                                'slug', a.slug, 'avatar_url', a.avatar_url) as author
      from posts p
      join post_categories pc on pc.post_id = p.id
      left join media m on m.id = p.featured_media_id
      left join authors a on a.id = p.author_id
      where p.type='post' and p.status='publish' and pc.category_id = sc.id
        and p.id not in (select id from hero_ids)
      order by p.published_at desc nulls last
      limit 3
    ) sp
  ),
  crisis_posts as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at,
           substring(p.content_html for 1500) as content_html,
           m.url as media_url,
           (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
           jsonb_build_object('id', a.id, 'display_name', a.display_name,
                              'slug', a.slug, 'avatar_url', a.avatar_url) as author
    from posts p
    join post_categories pc on pc.post_id = p.id
    join categories c on c.id = pc.category_id
    left join media m on m.id = p.featured_media_id
    left join authors a on a.id = p.author_id
    where p.type='post' and p.status='publish' and c.slug = p_crisis_slug
    order by p.published_at desc nulls last
    limit 3
  ),
  economy_post as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at,
           substring(p.content_html for 1500) as content_html,
           m.url as media_url,
           (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
           jsonb_build_object('id', a.id, 'display_name', a.display_name,
                              'slug', a.slug, 'avatar_url', a.avatar_url) as author
    from posts p
    join post_categories pc on pc.post_id = p.id
    join categories c on c.id = pc.category_id
    left join media m on m.id = p.featured_media_id
    left join authors a on a.id = p.author_id
    where p.type='post' and p.status='publish' and c.slug = p_economy_slug
    order by p.published_at desc nulls last
    limit 1
  ),
  top_authors_q as (
    select id, display_name, slug, avatar_url, bio, post_count
    from authors order by post_count desc nulls last limit 4
  ),
  footer as (
    select mi.label, mi.url, mi.position
    from menus mn join menu_items mi on mi.menu_id = mn.id
    where mn.slug = 'menu-2' order by mi.position
  )
  select jsonb_build_object(
    'latest', coalesce((select jsonb_agg(to_jsonb(le) order by le.published_at desc nulls last) from latest_enriched le), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_object_agg(section_slug, posts)
      from (
        select section_slug,
               jsonb_agg(jsonb_build_object(
                 'id', id, 'slug', slug, 'title', title, 'excerpt', excerpt,
                 'published_at', published_at, 'media_url', media_url, 'og_image', og_image,
                 'content_html', content_html, 'author', author, 'category', category
               ) order by published_at desc nulls last) as posts
        from section_posts group by section_slug
      ) g
    ), '{}'::jsonb),
    'crisis', coalesce((select jsonb_agg(to_jsonb(c) order by c.published_at desc nulls last) from crisis_posts c), '[]'::jsonb),
    'economy', (select to_jsonb(e) from economy_post e limit 1),
    'top_authors', coalesce((select jsonb_agg(to_jsonb(t)) from top_authors_q t), '[]'::jsonb),
    'footer_menu', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'url', url) order by position)
      from footer
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- get_archive_list — single RPC for category / tag / author / date / search
-- ============================================================================
create or replace function public.get_archive_list(
  p_kind text,                -- 'category' | 'tag' | 'author' | 'date' | 'search'
  p_slug text default null,
  p_year int default null,
  p_month int default null,
  p_day int default null,
  p_q text default null,
  p_page int default 1,
  p_page_size int default 10
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_offset int := greatest(0, (coalesce(p_page,1) - 1)) * p_page_size;
  v_term jsonb;
  v_post_ids bigint[];
  v_total int := 0;
  v_rows jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_tsq tsquery;
begin
  -- Resolve term + collect post ids
  if p_kind = 'category' then
    select jsonb_build_object('id', id, 'name', name, 'slug', slug,
      'description', description, 'kind', 'category')
      into v_term from categories where slug = p_slug;
    if v_term is null then return null; end if;
    select array_agg(post_id), count(*)::int into v_post_ids, v_total
      from post_categories where category_id = (v_term->>'id')::bigint;

  elsif p_kind = 'tag' then
    select jsonb_build_object('id', id, 'name', name, 'slug', slug,
      'description', description, 'kind', 'tag')
      into v_term from tags where slug = p_slug;
    if v_term is null then return null; end if;
    select array_agg(post_id), count(*)::int into v_post_ids, v_total
      from post_tags where tag_id = (v_term->>'id')::bigint;

  elsif p_kind = 'author' then
    select jsonb_build_object('id', id, 'display_name', display_name, 'slug', slug,
      'avatar_url', avatar_url, 'bio', bio, 'kind', 'author')
      into v_term from authors where slug = p_slug;
    if v_term is null then return null; end if;

  elsif p_kind = 'date' then
    v_start := make_timestamptz(p_year, coalesce(p_month,1), coalesce(p_day,1), 0,0,0);
    if p_day is not null then v_end := v_start + interval '1 day';
    elsif p_month is not null then v_end := v_start + interval '1 month';
    else v_end := v_start + interval '1 year';
    end if;

  elsif p_kind = 'search' then
    if coalesce(p_q,'') = '' then
      return jsonb_build_object(
        'header', jsonb_build_object('kind','search','title','Search','subtitle',null),
        'items', '[]'::jsonb, 'total', 0, 'page', 1
      );
    end if;
    v_tsq := websearch_to_tsquery('english', p_q);
  else
    return null;
  end if;

  -- Build the row set
  if p_kind in ('category','tag') then
    select jsonb_agg(t order by t.published_at desc nulls last) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
        substring(p.content_html for 1500) as content_html,
        m.url as media_url,
        (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
        jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
        (select jsonb_build_object('name', c2.name, 'slug', c2.slug)
         from post_categories pc2 join categories c2 on c2.id=pc2.category_id
         where pc2.post_id=p.id limit 1) as category
      from posts p
      left join media m on m.id = p.featured_media_id
      left join authors a on a.id = p.author_id
      where p.type='post' and p.status='publish' and p.id = any(v_post_ids)
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) t;

  elsif p_kind = 'author' then
    select count(*)::int into v_total from posts
      where type='post' and status='publish' and author_id = (v_term->>'id')::bigint;
    select jsonb_agg(t order by t.published_at desc nulls last) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
        substring(p.content_html for 1500) as content_html,
        m.url as media_url,
        (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
        jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
        (select jsonb_build_object('name', c2.name, 'slug', c2.slug)
         from post_categories pc2 join categories c2 on c2.id=pc2.category_id
         where pc2.post_id=p.id limit 1) as category
      from posts p
      left join media m on m.id = p.featured_media_id
      left join authors a on a.id = p.author_id
      where p.type='post' and p.status='publish' and p.author_id = (v_term->>'id')::bigint
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) t;

  elsif p_kind = 'date' then
    select count(*)::int into v_total from posts
      where type='post' and status='publish'
        and published_at >= v_start and published_at < v_end;
    select jsonb_agg(t order by t.published_at desc nulls last) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
        substring(p.content_html for 1500) as content_html,
        m.url as media_url,
        (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
        jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
        (select jsonb_build_object('name', c2.name, 'slug', c2.slug)
         from post_categories pc2 join categories c2 on c2.id=pc2.category_id
         where pc2.post_id=p.id limit 1) as category
      from posts p
      left join media m on m.id = p.featured_media_id
      left join authors a on a.id = p.author_id
      where p.type='post' and p.status='publish'
        and p.published_at >= v_start and p.published_at < v_end
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) t;

  elsif p_kind = 'search' then
    select count(*)::int into v_total from posts
      where type='post' and status='publish' and search_vector @@ v_tsq;
    select jsonb_agg(t order by t.rank desc, t.published_at desc nulls last) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
        substring(p.content_html for 1500) as content_html,
        m.url as media_url,
        (select s.og_image from seo_meta s where s.object_type='post' and s.object_id=p.id limit 1) as og_image,
        jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
        (select jsonb_build_object('name', c2.name, 'slug', c2.slug)
         from post_categories pc2 join categories c2 on c2.id=pc2.category_id
         where pc2.post_id=p.id limit 1) as category,
        ts_rank(p.search_vector, v_tsq) as rank
      from posts p
      left join media m on m.id = p.featured_media_id
      left join authors a on a.id = p.author_id
      where p.type='post' and p.status='publish' and p.search_vector @@ v_tsq
      order by ts_rank(p.search_vector, v_tsq) desc, p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) t;
  end if;

  return jsonb_build_object(
    'term', v_term,
    'total', coalesce(v_total,0),
    'page', coalesce(p_page,1),
    'page_size', p_page_size,
    'items', coalesce(v_rows, '[]'::jsonb),
    'date', case when p_kind='date'
      then jsonb_build_object('year', p_year, 'month', p_month, 'day', p_day) end,
    'q', case when p_kind='search' then p_q end
  );
end;
$$;

grant execute on function public.get_archive_list(text, text, int, int, int, text, int, int) to anon, authenticated;
