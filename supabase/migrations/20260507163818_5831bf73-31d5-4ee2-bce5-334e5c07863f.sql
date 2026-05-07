-- 1) Replace 5WPR with 5W in posts content and excerpts
UPDATE public.posts
SET content_html = regexp_replace(content_html, '5WPR', '5W', 'g'),
    excerpt = CASE WHEN excerpt IS NULL THEN NULL ELSE regexp_replace(excerpt, '5WPR', '5W', 'g') END
WHERE content_html ILIKE '%5WPR%' OR excerpt ILIKE '%5WPR%';

-- 2) Replace 5WPR with 5W in author bios
UPDATE public.authors
SET bio = regexp_replace(bio, '5WPR', '5W', 'g')
WHERE bio ILIKE '%5WPR%';

-- 3) Strip "based in New York", "New York-based", "New York based", and standalone "NYC" from post bodies
UPDATE public.posts
SET content_html = regexp_replace(
                     regexp_replace(
                       regexp_replace(
                         regexp_replace(content_html, '\s*,?\s*based in New York City\M', '', 'gi'),
                         '\s*,?\s*based in New York\M', '', 'gi'),
                       '\mNew York[- ]based\s*', '', 'gi'),
                     '\mNYC\M', '', 'g')
WHERE content_html ~* '(based in New York|New York[- ]based|\mNYC\M)';

-- 4) Same sweep on author bios
UPDATE public.authors
SET bio = regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(bio, '\s*,?\s*based in New York City\M', '', 'gi'),
                '\s*,?\s*based in New York\M', '', 'gi'),
              '\mNew York[- ]based\s*', '', 'gi'),
            '\mNYC\M', '', 'g')
WHERE bio ~* '(based in New York|New York[- ]based|\mNYC\M)';

-- 5) Rewrite Ronn Torossian's bio (shorter, no Wikipedia, no NY, standardized 5W boilerplate)
UPDATE public.authors
SET bio = $$<p>Ronn Torossian is Founder and Chairman of <strong><a href="https://www.5wpr.com/">5W</a></strong>, one of the largest independently owned public relations and digital marketing firms in the United States. Under his leadership, 5W is the AI Communications Firm — building the category around generative engine optimization (GEO), AI search visibility, and how brands earn presence inside ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.</p>

<p>Torossian founded 5W in 2003 and has scaled it across consumer, technology, financial services, healthcare, beauty, gaming, and crisis communications practices. 5W's research franchise — the <strong><a href="https://www.5wpr.com/new/research/">AI Visibility Index Series</a></strong>, <em>The GEO Reckoning</em>, and <em>The Missing Rung Report</em> — has become the industry reference for measuring brand visibility inside AI-generated answers.</p>

<p>He is one of the country's foremost crisis communications experts and the author of <em>For Immediate Release: Shape Minds, Build Brands, and Deliver Results With Game-Changing Public Relations</em>.</p>

<p><a href="https://www.5wpr.com/">5wpr.com</a> | <a href="https://www.5wpr.com/new/research/">5W Research</a> | <a href="https://ronntorossian.com/">ronntorossian.com</a></p>

<h2><strong>Work with 5W</strong></h2>

<p>5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, GEO, and influencer channels. <a href="https://www.5wpr.com/">www.5wpr.com</a></p>$$
WHERE slug = 'ronn-torossian';

-- 6) Standardize closing "5W is the premier AI communications firm" variants in any author bio
UPDATE public.authors
SET bio = regexp_replace(
            bio,
            '5W is the premier AI [Cc]ommunications [Ff]irm[^<]*',
            '5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, GEO, and influencer channels. <a href="https://www.5wpr.com/">www.5wpr.com</a>',
            'g')
WHERE bio ~* '5W is the premier AI [Cc]ommunications [Ff]irm';

-- 7) Strip any explicit Wikipedia links/text from Ronn's row (already rewritten above) and from any other author bios
UPDATE public.authors
SET bio = regexp_replace(bio, '<a[^>]*wikipedia\.org[^>]*>(.*?)</a>', '\1', 'gi')
WHERE bio ILIKE '%wikipedia.org%';