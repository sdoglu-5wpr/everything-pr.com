create index if not exists idx_posts_slug on public.posts (slug);
create index if not exists idx_posts_status_slug on public.posts (status, slug);
create index if not exists idx_posts_type_status_pub on public.posts (type, status, published_at desc nulls last);
create index if not exists idx_posts_type_status_mod on public.posts (type, status, modified_at desc nulls last);
create index if not exists idx_posts_author_id on public.posts (author_id);
create index if not exists idx_posts_featured_media on public.posts (featured_media_id);
create index if not exists idx_posts_search on public.posts using gin (search_vector);
create index if not exists idx_post_categories_post on public.post_categories (post_id);
create index if not exists idx_post_categories_cat on public.post_categories (category_id);
create index if not exists idx_post_categories_cat_post on public.post_categories (category_id, post_id);
create index if not exists idx_post_tags_post on public.post_tags (post_id);
create index if not exists idx_post_tags_tag on public.post_tags (tag_id);
create index if not exists idx_post_tags_tag_post on public.post_tags (tag_id, post_id);
create index if not exists idx_internal_links_source on public.internal_links (source_post_id);
create index if not exists idx_internal_links_target on public.internal_links (target_post_id);
create index if not exists idx_seo_meta_obj on public.seo_meta (object_type, object_id);
create index if not exists idx_categories_slug on public.categories (slug);
create index if not exists idx_tags_slug on public.tags (slug);
create index if not exists idx_authors_slug on public.authors (slug);
create index if not exists idx_media_id on public.media (id);
create index if not exists idx_menu_items_menu_position on public.menu_items (menu_id, position);
create index if not exists idx_menus_slug on public.menus (slug);

create or replace function public.get_article_full(slug_param text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target_post as (
    select p.*
    from public.posts p
    where p.slug = slug_param
      and p.status = 'publish'
      and p.type in ('post','page')
    order by p.published_at desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'post', to_jsonb(p.*),
    'author', to_jsonb(a.*),
    'featured_media', to_jsonb(m.*),
    'categories', coalesce(cats.items, '[]'::jsonb),
    'tags', coalesce(tags.items, '[]'::jsonb),
    'seo', seo.item,
    'top_stories', coalesce(top_stories.items, '[]'::jsonb),
    'other_news', coalesce(other_news.items, '[]'::jsonb),
    'related', coalesce(related.items, '[]'::jsonb)
  )
  from target_post p
  left join public.authors a on a.id = p.author_id
  left join public.media m on m.id = p.featured_media_id
  left join lateral (
    select jsonb_agg(to_jsonb(c.*) order by c.name) as items
    from public.post_categories pc
    join public.categories c on c.id = pc.category_id
    where pc.post_id = p.id
  ) cats on true
  left join lateral (
    select jsonb_agg(to_jsonb(t.*) order by t.name) as items
    from public.post_tags pt
    join public.tags t on t.id = pt.tag_id
    where pt.post_id = p.id
  ) tags on true
  left join lateral (
    select to_jsonb(s.*) as item
    from public.seo_meta s
    where s.object_type = 'post' and s.object_id = p.id
    limit 1
  ) seo on true
  left join lateral (
    select jsonb_agg(to_jsonb(ts.*) order by ts.published_at desc nulls last) as items
    from (
      select pp.id, pp.slug, pp.title, pp.excerpt, pp.published_at,
             substring(pp.content_html for 1500) as content_html,
             mm.url as media_url, ss.og_image,
             jsonb_build_object('id', aa.id, 'display_name', aa.display_name, 'slug', aa.slug) as author,
             cat.category
      from public.posts pp
      left join public.media mm on mm.id = pp.featured_media_id
      left join public.authors aa on aa.id = pp.author_id
      left join public.seo_meta ss on ss.object_type = 'post' and ss.object_id = pp.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2
        join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = pp.id
        limit 1
      ) cat on true
      where pp.type = 'post' and pp.status = 'publish' and pp.id <> p.id
      order by pp.published_at desc nulls last
      limit 4
    ) ts
  ) top_stories on true
  left join lateral (
    select jsonb_agg(to_jsonb(onw.*) order by onw.published_at desc nulls last) as items
    from (
      select pp.id, pp.slug, pp.title, pp.excerpt, pp.published_at,
             substring(pp.content_html for 1500) as content_html,
             mm.url as media_url, ss.og_image,
             jsonb_build_object('id', aa.id, 'display_name', aa.display_name, 'slug', aa.slug) as author,
             cat.category
      from public.posts pp
      left join public.media mm on mm.id = pp.featured_media_id
      left join public.authors aa on aa.id = pp.author_id
      left join public.seo_meta ss on ss.object_type = 'post' and ss.object_id = pp.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2
        join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = pp.id
        limit 1
      ) cat on true
      where pp.type = 'post' and pp.status = 'publish' and pp.id <> p.id
      order by pp.published_at desc nulls last
      offset 4 limit 3
    ) onw
  ) other_news on true
  left join lateral (
    select jsonb_agg(to_jsonb(r.*) order by r.published_at desc nulls last) as items
    from (
      select pp.id, pp.slug, pp.title, pp.excerpt, pp.published_at,
             substring(pp.content_html for 1500) as content_html,
             mm.url as media_url, ss.og_image,
             jsonb_build_object('id', aa.id, 'display_name', aa.display_name, 'slug', aa.slug) as author,
             cat.category
      from public.internal_links il
      join public.posts pp on pp.id = il.target_post_id
      left join public.media mm on mm.id = pp.featured_media_id
      left join public.authors aa on aa.id = pp.author_id
      left join public.seo_meta ss on ss.object_type = 'post' and ss.object_id = pp.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2
        join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = pp.id
        limit 1
      ) cat on true
      where il.source_post_id = p.id and pp.status = 'publish'
      limit 3
    ) r
  ) related on true;
$$;

grant execute on function public.get_article_full(text) to anon, authenticated;

create or replace function public.get_homepage_data(
  p_section_slugs text[] default array['pr-news','pr-insights','marketing','social-media'],
  p_crisis_slug text default 'crisis-pr',
  p_economy_slug text default 'corporate-pr'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with latest as materialized (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           substring(p.content_html for 1500) as content_html,
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
             substring(p.content_html for 1500) as content_html,
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
      limit 4
    ) x
  ),
  crisis_posts as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           substring(p.content_html for 1500) as content_html,
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
    limit 4
  ),
  economy_post as (
    select p.id, p.slug, p.title, p.excerpt, p.published_at, p.featured_media_id, p.author_id,
           substring(p.content_html for 1500) as content_html,
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
    limit 4
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
$$;

grant execute on function public.get_homepage_data(text[], text, text) to anon, authenticated;

create or replace function public.get_archive_list(
  p_kind text,
  p_slug text default null,
  p_year int default null,
  p_month int default null,
  p_day int default null,
  p_q text default null,
  p_page int default 1,
  p_page_size int default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_offset int := greatest(0, (coalesce(p_page, 1) - 1)) * coalesce(p_page_size, 10);
  v_term jsonb := null;
  v_total int := 0;
  v_rows jsonb := '[]'::jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_tsq tsquery;
begin
  if p_kind = 'category' then
    select jsonb_build_object('id', id, 'name', name, 'slug', slug, 'description', description, 'kind', 'category')
      into v_term from public.categories where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.post_categories pc
    join public.posts p on p.id = pc.post_id
    where pc.category_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url, s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
             jsonb_build_object('name', c.name, 'slug', c.slug) as category
      from public.post_categories pc
      join public.categories c on c.id = pc.category_id
      join public.posts p on p.id = pc.post_id
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      where pc.category_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish'
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

  elsif p_kind = 'tag' then
    select jsonb_build_object('id', id, 'name', name, 'slug', slug, 'description', description, 'kind', 'tag')
      into v_term from public.tags where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.post_tags pt
    join public.posts p on p.id = pt.post_id
    where pt.tag_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url, s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
             cat.category
      from public.post_tags pt
      join public.posts p on p.id = pt.post_id
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2 join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = p.id limit 1
      ) cat on true
      where pt.tag_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish'
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

  elsif p_kind = 'author' then
    select jsonb_build_object('id', id, 'display_name', display_name, 'slug', slug, 'avatar_url', avatar_url, 'bio', bio, 'kind', 'author')
      into v_term from public.authors where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.posts p
    where p.author_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url, s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
             cat.category
      from public.posts p
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2 join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = p.id limit 1
      ) cat on true
      where p.author_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish'
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

  elsif p_kind = 'date' then
    v_start := make_timestamptz(p_year, coalesce(p_month, 1), coalesce(p_day, 1), 0, 0, 0);
    if p_day is not null then
      v_end := v_start + interval '1 day';
    elsif p_month is not null then
      v_end := v_start + interval '1 month';
    else
      v_end := v_start + interval '1 year';
    end if;

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish' and p.published_at >= v_start and p.published_at < v_end;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url, s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
             cat.category
      from public.posts p
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2 join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = p.id limit 1
      ) cat on true
      where p.type = 'post' and p.status = 'publish' and p.published_at >= v_start and p.published_at < v_end
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

  elsif p_kind = 'search' then
    if coalesce(trim(p_q), '') = '' then
      return jsonb_build_object('term', null, 'total', 0, 'page', 1, 'page_size', p_page_size, 'items', '[]'::jsonb, 'q', p_q);
    end if;
    v_tsq := websearch_to_tsquery('english', p_q);

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish' and p.search_vector @@ v_tsq;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.rank desc, x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             substring(p.content_html for 1500) as content_html,
             m.url as media_url, s.og_image,
             jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
             cat.category,
             ts_rank(p.search_vector, v_tsq) as rank
      from public.posts p
      left join public.media m on m.id = p.featured_media_id
      left join public.authors a on a.id = p.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
      left join lateral (
        select jsonb_build_object('name', c2.name, 'slug', c2.slug) as category
        from public.post_categories pc2 join public.categories c2 on c2.id = pc2.category_id
        where pc2.post_id = p.id limit 1
      ) cat on true
      where p.type = 'post' and p.status = 'publish' and p.search_vector @@ v_tsq
      order by ts_rank(p.search_vector, v_tsq) desc, p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;
  else
    return null;
  end if;

  return jsonb_build_object(
    'term', v_term,
    'total', coalesce(v_total, 0),
    'page', coalesce(p_page, 1),
    'page_size', p_page_size,
    'items', coalesce(v_rows, '[]'::jsonb),
    'date', case when p_kind = 'date' then jsonb_build_object('year', p_year, 'month', p_month, 'day', p_day) end,
    'q', case when p_kind = 'search' then p_q end
  );
end;
$$;

grant execute on function public.get_archive_list(text, text, int, int, int, text, int, int) to anon, authenticated;