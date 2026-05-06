-- Pillars table — long-form category landing pages tied to a category slug
create table if not exists public.pillars (
  id bigint primary key,
  slug text not null unique,
  title text not null,
  subtitle text,
  byline text,
  body_html text not null default '',
  schema_jsonld jsonb,
  faq jsonb not null default '[]'::jsonb,
  hero_image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pillars enable row level security;

drop policy if exists "public read pillars" on public.pillars;
create policy "public read pillars" on public.pillars for select using (published = true or is_staff(auth.uid()));

drop policy if exists "staff write pillars" on public.pillars;
create policy "staff write pillars" on public.pillars for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop trigger if exists trg_pillars_updated_at on public.pillars;
create trigger trg_pillars_updated_at before update on public.pillars
  for each row execute function public.set_updated_at();

-- RPC: fetch pillar (by slug) + recent articles in matching category
create or replace function public.get_pillar(p_slug text, p_page int default 1, p_page_size int default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $func$
declare
  v_pillar jsonb;
  v_cat_id bigint;
  v_total int := 0;
  v_offset int := greatest(0, (coalesce(p_page,1)-1)) * coalesce(p_page_size,12);
  v_items jsonb := '[]'::jsonb;
begin
  select to_jsonb(p.*) into v_pillar from public.pillars p where p.slug = p_slug and p.published = true limit 1;
  if v_pillar is null then return null; end if;

  select id into v_cat_id from public.categories where slug = p_slug limit 1;

  if v_cat_id is not null then
    select count(*)::int into v_total
    from public.post_categories pc join public.posts po on po.id = pc.post_id
    where pc.category_id = v_cat_id and po.type = 'post' and po.status = 'publish';

    select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last), '[]'::jsonb) into v_items
    from (
      select po.id, po.slug, po.title, po.excerpt, po.published_at,
        po.first_inline_image as content_html,
        m.url as media_url, s.og_image,
        jsonb_build_object('id', a.id, 'display_name', a.display_name, 'slug', a.slug) as author,
        jsonb_build_object('name', c.name, 'slug', c.slug) as category
      from public.post_categories pc
      join public.categories c on c.id = pc.category_id
      join public.posts po on po.id = pc.post_id
      left join public.media m on m.id = po.featured_media_id
      left join public.authors a on a.id = po.author_id
      left join public.seo_meta s on s.object_type = 'post' and s.object_id = po.id
      where pc.category_id = v_cat_id and po.type = 'post' and po.status = 'publish'
      order by po.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;
  end if;

  return jsonb_build_object(
    'pillar', v_pillar,
    'category_id', v_cat_id,
    'total', v_total,
    'page', coalesce(p_page,1),
    'page_size', coalesce(p_page_size,12),
    'items', v_items
  );
end;
$func$;