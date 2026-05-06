CREATE OR REPLACE FUNCTION public.get_research_list(p_page integer DEFAULT 1, p_page_size integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '20s'
AS $function$
declare
  v_offset int := greatest(0, (coalesce(p_page,1)-1)) * coalesce(p_page_size,12);
  v_total int := 0;
  v_rows jsonb := '[]'::jsonb;
  v_tsq tsquery := websearch_to_tsquery('english', 'research OR study OR survey OR report');
  v_cat_ids bigint[];
begin
  select coalesce(array_agg(id), '{}'::bigint[]) into v_cat_ids
  from public.categories where slug ilike '%research%' or slug ilike '%study%' or slug ilike '%report%';

  with candidate as (
    select distinct p.id, p.published_at
    from public.posts p
    where p.type = 'post' and p.status = 'publish'
      and (
        p.search_vector @@ v_tsq
        or p.title ~* '\m(research|study|survey|report)\M'
        or exists (
          select 1 from public.post_categories pc
          where pc.post_id = p.id and pc.category_id = any(v_cat_ids)
        )
      )
  )
  select count(*)::int into v_total from candidate;

  with candidate as (
    select distinct p.id, p.published_at
    from public.posts p
    where p.type = 'post' and p.status = 'publish'
      and (
        p.search_vector @@ v_tsq
        or p.title ~* '\m(research|study|survey|report)\M'
        or exists (
          select 1 from public.post_categories pc
          where pc.post_id = p.id and pc.category_id = any(v_cat_ids)
        )
      )
    order by p.published_at desc nulls last
    offset v_offset limit p_page_size
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_rows
  from (
    select p.id, p.slug, p.title, p.excerpt, p.published_at,
      p.first_inline_image as content_html,
      m.url as media_url, s.og_image,
      jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
      (
        select jsonb_build_object('name', c.name, 'slug', c.slug)
        from public.post_categories pc2
        join public.categories c on c.id = pc2.category_id
        where pc2.post_id = p.id
        order by case when c.id = any(v_cat_ids) then 0 else 1 end, c.id
        limit 1
      ) as category
    from candidate cp
    join public.posts p on p.id = cp.id
    left join public.media m on m.id = p.featured_media_id
    left join public.authors a on a.id = p.author_id
    left join public.seo_meta s on s.object_type = 'post' and s.object_id = p.id
  ) x;

  return jsonb_build_object('total', v_total, 'page', coalesce(p_page,1), 'page_size', coalesce(p_page_size,12), 'items', v_rows);
end;
$function$;