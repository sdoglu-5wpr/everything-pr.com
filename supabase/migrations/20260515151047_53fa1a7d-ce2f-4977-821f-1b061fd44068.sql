
-- 1. Schema additions
ALTER TABLE public.authors
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS knows_about jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS works_for jsonb;

-- 2. Patch the author branch of get_archive_list so the new fields surface
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
    select jsonb_build_object(
      'id', id, 'display_name', display_name, 'slug', slug,
      'avatar_url', avatar_url, 'bio', bio, 'website', website,
      'email', email, 'social', social, 'post_count', post_count,
      'tags', tags, 'job_title', job_title,
      'knows_about', knows_about, 'works_for', works_for,
      'kind', 'author'
    )
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
    if p_day is not null and p_month is not null then
      v_start := make_timestamptz(p_year, p_month, p_day, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 day';
    elsif p_month is not null then
      v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 month';
    else
      v_start := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC');
      v_end := v_start + interval '1 year';
    end if;

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish' and p.published_at >= v_start and p.published_at < v_end;

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
      where p.type = 'post' and p.status = 'publish' and p.published_at >= v_start and p.published_at < v_end
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

    v_term := jsonb_build_object('kind', 'date', 'year', p_year, 'month', p_month, 'day', p_day);

  elsif p_kind = 'search' then
    if coalesce(trim(p_q), '') = '' then return null; end if;
    v_tsq := websearch_to_tsquery('simple', p_q);

    select count(*)::int into v_total
    from public.posts p
    where p.type = 'post' and p.status = 'publish' and p.search_vector @@ v_tsq;

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
      where p.type = 'post' and p.status = 'publish' and p.search_vector @@ v_tsq
      order by p.published_at desc nulls last
      offset v_offset limit p_page_size
    ) x;

    v_term := jsonb_build_object('kind', 'search', 'q', p_q);

  else
    return null;
  end if;

  return jsonb_build_object('term', v_term, 'total', v_total, 'items', v_rows);
end;
$function$;

-- 3. Insert the two new contributors (skip if a slug already exists)
INSERT INTO public.authors
  (id, slug, display_name, email, bio, website, social, tags, job_title, knows_about, works_for, post_count)
VALUES
  (
    20563,
    'pcullinane',
    'Patrick Cullinane',
    NULL,
    '<p>Patrick Cullinane is Director of Engineering and Middle School Dean at The Greene School, an independent Pre-K through 12th grade school in West Palm Beach, Florida. He oversees engineering curriculum, advises faculty on AI implementation, and leads middle school operations. His work focuses on the integration of artificial intelligence across academic disciplines — including required AI use in Digital Design coursework, prompt-engineering instruction in programming courses, and AI-assisted study tools across the humanities.</p><p>Cullinane is currently completing doctoral research on AI adoption in private K–12 schools — examining how teachers use the technology, how administrations build procedures around it, and how the pace of change is reshaping school operations. Under his direction, Greene School students entered the Presidential AI Challenge with an AI-powered hurricane preparedness application built around public-safety data analysis. The Greene School is among the South Florida private schools responding to the 2026 Florida Private School AI Study published by 5W and HL Real Estate Group by Haute Living.</p><p>For Everything-PR, Patrick writes on AI integration in private K–12 education — covering schoolwide AI policy, faculty training, curriculum design, prompt-engineering instruction, classroom implementation, and student project work. His perspective is built inside the classroom, not from the consulting deck.</p><h3>Areas of Expertise</h3><ul><li>AI integration in private K–12 education</li><li>AI policy frameworks and academic integrity in the AI era</li><li>Prompt engineering as instructional discipline</li><li>AI-assisted engineering and digital design curriculum</li><li>Faculty AI training and classroom implementation</li></ul>',
    'https://thegreeneschool.com',
    '{"linkedin":"https://www.linkedin.com/in/patrickcullinane/"}'::jsonb,
    '["Contributor","Education","AI","EdTech"]'::jsonb,
    'Director of Engineering and Middle School Dean',
    '["AI integration in private K-12 education","AI policy frameworks and academic integrity in the AI era","Prompt engineering as instructional discipline","AI-assisted engineering and digital design curriculum","Faculty AI training and classroom implementation"]'::jsonb,
    '{"@type":"EducationalOrganization","name":"The Greene School","url":"https://thegreeneschool.com","address":{"@type":"PostalAddress","streetAddress":"2001 S Dixie Highway","addressLocality":"West Palm Beach","addressRegion":"FL","postalCode":"33401","addressCountry":"US"}}'::jsonb,
    0
  ),
  (
    20564,
    'alex-shvarts',
    'Alex Shvarts',
    NULL,
    '<p>Alex Shvarts is the Founder and Chief Technology Officer of FundKite, one of the fastest-growing alternative funding platforms in the U.S. small business finance market. Since founding the firm in 2015, Shvarts has built FundKite into a $70M revenue fintech that has deployed more than $200M in capital to small businesses across the country — operating in the gap left by retreating banks, tightened SBA criteria, and a small business credit market that no longer functions the way it did a decade ago.</p><p>Before FundKite, Shvarts engineered and sold proprietary technology to the broader fintech industry. His dual background in software architecture and capital markets is the operating thesis of the firm — FundKite is finance-first, but the underwriting, the reconciliation, the merchant monitoring, and increasingly the credit decisioning run on technology Shvarts built.</p><p>He is a member of the Forbes Technology Council and a regular source for trade and business press on small business funding, merchant cash advance, revenue-based financing, default and charge-off dynamics, AI underwriting, and credit card processor partnerships.</p><p>At Everything-PR Finance, Shvarts writes on the structural shifts inside small business capital — what banks no longer see, where the next default cycle is coming from, how AI is reshaping underwriting, and why the alternative funding category is now larger and more critical to the U.S. economy than most policymakers realize.</p><h3>Areas of Expertise</h3><ul><li>Small business funding and alternative lending</li><li>Merchant cash advance and revenue-based financing</li><li>Fintech underwriting and AI credit decisioning</li><li>Credit card processor partnerships (Square, Shopify, Stripe)</li><li>Default, charge-off, and reconciliation dynamics</li><li>Capital markets for non-bank lenders</li><li>Structured notes and capital partner economics</li></ul><h3>Credentials</h3><ul><li>Founder &amp; CTO, FundKite (2015–present)</li><li>Member, Forbes Technology Council</li><li>$200M+ capital deployed to U.S. small businesses</li><li>Featured in PR Newswire, Forbes, Fintech Newscast, Latka</li></ul>',
    'https://www.fundkite.com',
    '{"linkedin":"https://www.linkedin.com/in/alexshvarts"}'::jsonb,
    '["Contributor","Finance","Fintech","Alternative Lending"]'::jsonb,
    'Founder and Chief Technology Officer',
    '["Small Business Funding","Merchant Cash Advance","Revenue-Based Financing","Fintech Underwriting","AI Credit Decisioning","Alternative Lending"]'::jsonb,
    '{"@type":"Organization","name":"FundKite","url":"https://www.fundkite.com"}'::jsonb,
    0
  )
ON CONFLICT (id) DO NOTHING;
