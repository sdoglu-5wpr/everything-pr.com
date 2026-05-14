
-- Phase 2N — non-destructive batch (steps J, G, H, E, B, F, I)

-- =========================================================
-- J. Drop pre-existing /ai legacy redirects (frees /ai slug)
-- =========================================================
DELETE FROM public.redirects WHERE source_path IN ('/ai','/ai/');

-- Drop bogus /press-releases → /press-release-2-2 (frees /press-releases slug for future Resources hub)
DELETE FROM public.redirects WHERE source_path='/press-releases/' AND target_path='/press-release-2-2';

-- =========================================================
-- B. Web3 → Crypto & Web3 (cat 27959 has 0 attached posts)
-- =========================================================
UPDATE public.categories SET slug='crypto-web3', name='Crypto & Web3', updated_at=now() WHERE id=27959;
UPDATE public.pillars    SET slug='crypto-web3', title='Crypto & Web3 Communications', updated_at=now() WHERE id=21;

INSERT INTO public.redirects (source_path, target_path, status_code, enabled) VALUES
  ('/web3/',  '/crypto-web3/', 301, true),
  ('/web3',   '/crypto-web3/', 301, true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- F. Entertainment-PR → Entertainment & Media (cat rename, 172 posts ride along)
-- =========================================================
UPDATE public.categories SET slug='entertainment-media', name='Entertainment & Media', updated_at=now() WHERE id=22744;

INSERT INTO public.pillars (id, slug, title, subtitle, byline, body_html, faq, published)
VALUES (30, 'entertainment-media', 'Entertainment & Media Communications',
        'Coverage in progress',
        'Everything-PR Editorial',
        '<p>Entertainment & Media PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>',
        '[]'::jsonb, false);

INSERT INTO public.redirects (source_path, target_path, status_code, enabled) VALUES
  ('/entertainment-pr/', '/entertainment-media/', 301, true),
  ('/entertainment-pr',  '/entertainment-media/', 301, true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- E. Fashion: cat 27641 already exists; just create pillar
-- =========================================================
INSERT INTO public.pillars (id, slug, title, subtitle, byline, body_html, faq, published)
VALUES (31, 'fashion', 'Fashion Communications',
        'Coverage in progress',
        'Everything-PR Editorial',
        '<p>Fashion PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>',
        '[]'::jsonb, false);

-- =========================================================
-- G + H. New SECTOR + DISCIPLINE stubs (categories + pillars, all draft)
-- 9 sectors: ai, automotive-mobility, energy, enterprise-saas, fintech,
--           food-beverage, politics-government, retail-ecommerce, startups-venture
-- 12 disciplines: analyst-relations, b2b-marketing, content-marketing,
--                 event-experiential, government-relations-lobbying,
--                 influencer-marketing, internal-communications, investor-relations,
--                 media-training, paid-media, podcast-pr, seo
-- Categories get fresh ids 27964..27984 (21 rows)
-- Pillars get fresh ids 32..52 (21 rows)
-- =========================================================
INSERT INTO public.categories (id, slug, name, description) VALUES
  (27964,'ai','AI','AI sector PR & AI Communications coverage from Everything-PR.'),
  (27965,'automotive-mobility','Automotive & Mobility','Automotive & Mobility PR & AI Communications coverage from Everything-PR.'),
  (27966,'energy','Energy','Energy PR & AI Communications coverage from Everything-PR.'),
  (27967,'enterprise-saas','Enterprise SaaS','Enterprise SaaS PR & AI Communications coverage from Everything-PR.'),
  (27968,'fintech','Fintech','Fintech PR & AI Communications coverage from Everything-PR.'),
  (27969,'food-beverage','Food & Beverage','Food & Beverage PR & AI Communications coverage from Everything-PR.'),
  (27970,'politics-government','Politics & Government','Politics & Government PR & AI Communications coverage from Everything-PR.'),
  (27971,'retail-ecommerce','Retail & eCommerce','Retail & eCommerce PR & AI Communications coverage from Everything-PR.'),
  (27972,'startups-venture','Startups & Venture','Startups & Venture PR & AI Communications coverage from Everything-PR.'),
  (27973,'analyst-relations','Analyst Relations','Analyst Relations coverage from Everything-PR.'),
  (27974,'b2b-marketing','B2B Marketing','B2B Marketing coverage from Everything-PR.'),
  (27975,'content-marketing','Content Marketing','Content Marketing coverage from Everything-PR.'),
  (27976,'event-experiential','Event & Experiential','Event & Experiential marketing coverage from Everything-PR.'),
  (27977,'government-relations-lobbying','Government Relations & Lobbying','Government Relations & Lobbying coverage from Everything-PR.'),
  (27978,'influencer-marketing','Influencer Marketing','Influencer Marketing coverage from Everything-PR.'),
  (27979,'internal-communications','Internal Communications','Internal Communications coverage from Everything-PR.'),
  (27980,'investor-relations','Investor Relations','Investor Relations coverage from Everything-PR.'),
  (27981,'media-training','Media Training','Media Training coverage from Everything-PR.'),
  (27982,'paid-media','Paid Media','Paid Media coverage from Everything-PR.'),
  (27983,'podcast-pr','Podcast PR','Podcast PR coverage from Everything-PR.'),
  (27984,'seo','SEO','SEO coverage from Everything-PR.');

INSERT INTO public.pillars (id, slug, title, subtitle, byline, body_html, faq, published) VALUES
  (32,'ai','AI Communications & PR','Coverage in progress','Everything-PR Editorial','<p>AI PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (33,'automotive-mobility','Automotive & Mobility Communications','Coverage in progress','Everything-PR Editorial','<p>Automotive & Mobility PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (34,'energy','Energy Communications','Coverage in progress','Everything-PR Editorial','<p>Energy PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (35,'enterprise-saas','Enterprise SaaS Communications','Coverage in progress','Everything-PR Editorial','<p>Enterprise SaaS PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (36,'fintech','Fintech Communications','Coverage in progress','Everything-PR Editorial','<p>Fintech PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (37,'food-beverage','Food & Beverage Communications','Coverage in progress','Everything-PR Editorial','<p>Food & Beverage PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (38,'politics-government','Politics & Government Communications','Coverage in progress','Everything-PR Editorial','<p>Politics & Government PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (39,'retail-ecommerce','Retail & eCommerce Communications','Coverage in progress','Everything-PR Editorial','<p>Retail & eCommerce PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (40,'startups-venture','Startups & Venture Communications','Coverage in progress','Everything-PR Editorial','<p>Startups & Venture PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (41,'analyst-relations','Analyst Relations','Coverage in progress','Everything-PR Editorial','<p>Analyst Relations coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (42,'b2b-marketing','B2B Marketing','Coverage in progress','Everything-PR Editorial','<p>B2B Marketing coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (43,'content-marketing','Content Marketing','Coverage in progress','Everything-PR Editorial','<p>Content Marketing coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (44,'event-experiential','Event & Experiential Marketing','Coverage in progress','Everything-PR Editorial','<p>Event & Experiential coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (45,'government-relations-lobbying','Government Relations & Lobbying','Coverage in progress','Everything-PR Editorial','<p>Government Relations & Lobbying coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (46,'influencer-marketing','Influencer Marketing','Coverage in progress','Everything-PR Editorial','<p>Influencer Marketing coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (47,'internal-communications','Internal Communications','Coverage in progress','Everything-PR Editorial','<p>Internal Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (48,'investor-relations','Investor Relations','Coverage in progress','Everything-PR Editorial','<p>Investor Relations coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (49,'media-training','Media Training','Coverage in progress','Everything-PR Editorial','<p>Media Training coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (50,'paid-media','Paid Media','Coverage in progress','Everything-PR Editorial','<p>Paid Media coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (51,'podcast-pr','Podcast PR','Coverage in progress','Everything-PR Editorial','<p>Podcast PR coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false),
  (52,'seo','SEO','Coverage in progress','Everything-PR Editorial','<p>SEO coverage from Everything-PR. Definition copy is being prepared and will publish shortly.</p>','[]'::jsonb,false);

-- =========================================================
-- I. Press Releases + Public Relations: retitle, no content moves
-- =========================================================
UPDATE public.categories SET name='Press Releases', updated_at=now() WHERE id=23224;
UPDATE public.categories SET name='PR Perspectives', updated_at=now() WHERE id=22740;

INSERT INTO public.redirects (source_path, target_path, status_code, enabled) VALUES
  ('/public-relations/', '/about/', 301, true),
  ('/public-relations',  '/about/', 301, true)
ON CONFLICT DO NOTHING;
