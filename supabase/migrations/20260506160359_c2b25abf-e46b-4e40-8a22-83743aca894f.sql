CREATE OR REPLACE FUNCTION public.get_archive_list(p_kind text, p_slug text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_month integer DEFAULT NULL::integer, p_day integer DEFAULT NULL::integer, p_q text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '20s'
AS $function$
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
    select jsonb_build_object(
      'id', id, 'name', name, 'slug', slug, 'description', description, 'kind', 'category',
      'seo_title', seo_title, 'seo_description', seo_description,
      'canonical_url', canonical_url, 'robots', robots,
      'og_image', og_image, 'focus_keyword', focus_keyword
    )
      into v_term from public.categories where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.post_categories pc
    join public.posts p on p.id = pc.post_id
    where pc.category_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             p.first_inline_image as content_html,
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
    select jsonb_build_object(
      'id', id, 'name', name, 'slug', slug, 'description', description, 'kind', 'tag',
      'seo_title', seo_title, 'seo_description', seo_description,
      'canonical_url', canonical_url, 'robots', robots,
      'og_image', og_image, 'focus_keyword', focus_keyword
    )
      into v_term from public.tags where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.post_tags pt
    join public.posts p on p.id = pt.post_id
    where pt.tag_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             p.first_inline_image as content_html,
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
    select jsonb_build_object('id', id, 'display_name', display_name, 'slug', slug, 'avatar_url', avatar_url, 'bio', bio, 'website', website, 'email', email, 'social', social, 'post_count', post_count, 'kind', 'author')
      into v_term from public.authors where slug = p_slug limit 1;
    if v_term is null then return null; end if;

    select count(*)::int into v_total
    from public.posts p
    where p.author_id = (v_term->>'id')::bigint and p.type = 'post' and p.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             p.first_inline_image as content_html,
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
    if p_year is null then return null; end if;
    if p_month is null then
      v_start := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 year';
    elsif p_day is null then
      v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 month';
    else
      v_start := make_timestamptz(p_year, p_month, p_day, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 day';
    end if;

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish'
      and p.published_at >= v_start and p.published_at < v_end;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             p.first_inline_image as content_html,
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
      where p.type = 'post' and p.status = 'publish'
        and p.published_at >= v_start and p.published_at < v_end
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

  elsif p_kind = 'search' then
    if coalesce(trim(p_q), '') = '' then
      return jsonb_build_object('term', null, 'total', 0, 'items', '[]'::jsonb);
    end if;
    v_tsq := websearch_to_tsquery('english', p_q);

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish'
      and p.search_vector @@ v_tsq;

    select coalesce(jsonb_agg(to_jsonb(x) order by x.rank desc, x.published_at desc nulls last), '[]'::jsonb) into v_rows
    from (
      select p.id, p.slug, p.title, p.excerpt, p.published_at,
             p.first_inline_image as content_html,
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
      where p.type = 'post' and p.status = 'publish'
        and p.search_vector @@ v_tsq
      order by ts_rank(p.search_vector, v_tsq) desc, p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;
  else
    return null;
  end if;

  return jsonb_build_object('term', v_term, 'total', v_total, 'items', v_rows);
end;
$function$;