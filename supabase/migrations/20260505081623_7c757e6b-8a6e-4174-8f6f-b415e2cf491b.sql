
WITH base AS (SELECT COALESCE(MAX(id),0) AS m FROM public.posts)
INSERT INTO public.posts (id, slug, title, type, status, content_html, content_text, excerpt, published_at, modified_at)
SELECT base.m + n, slug, title, 'page'::content_type, 'publish'::post_status, ch, ct, ex, now(), now()
FROM base, (VALUES
  (1,'ethics-policy','Ethics Policy',
   '<h1>Ethics Policy</h1><p>Everything-PR is committed to honest, accurate, and independent reporting on the public relations industry. Our editorial team operates free from commercial influence and discloses any potential conflicts of interest.</p><p>We do not accept payment in exchange for editorial coverage. Sponsored content is clearly labeled as such. Sources are verified, corrections are issued promptly, and we welcome feedback from readers and subjects of our reporting.</p><p>For questions about our editorial standards, please consult our <a href="/editorial-policy/">Editorial Policy</a> or contact us via the <a href="/contact/">contact page</a>.</p><p><em>Last updated: 2026-05-05.</em></p>',
   'Everything-PR is committed to honest, accurate, and independent reporting.',
   'Everything-PR ethical standards covering accuracy, conflicts of interest, and editorial independence.'),
  (2,'corrections-policy','Corrections Policy',
   '<h1>Corrections Policy</h1><p>Everything-PR strives for accuracy in all reporting. When we publish material that is later found to be incorrect, we issue a correction promptly and transparently.</p><p>Minor typographical fixes are made silently. Substantive corrections are appended to the bottom of the article with a dated correction note.</p><p>To request a correction, please email us via the <a href="/contact/">contact page</a> with the article URL, the specific passage in question, and your suggested correction along with supporting documentation. For broader editorial standards, see our <a href="/editorial-policy/">Editorial Policy</a>.</p><p><em>Last updated: 2026-05-05.</em></p>',
   'Everything-PR strives for accuracy in all reporting and issues corrections transparently.',
   'How Everything-PR handles factual errors, correction notes, and reader-submitted correction requests.')
) AS v(n,slug,title,ch,ct,ex);

INSERT INTO public.redirects (source_path, target_path, status_code, enabled, notes)
VALUES
  ('/research/','/category/research/',301,true,'Legacy WP slug → category archive'),
  ('/rfp/','/category/rfp/',301,true,'Legacy WP slug → category archive');
