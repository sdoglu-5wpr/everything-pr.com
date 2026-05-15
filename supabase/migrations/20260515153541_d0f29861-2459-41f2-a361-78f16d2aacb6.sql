INSERT INTO public.pillars (slug, title, subtitle, body_html, faq, published)
SELECT 'b2b', 'B2B Communications & GEO Intelligence',
  subtitle, body_html, faq, true
FROM (SELECT
  'Where enterprise software, SaaS, and B2B technology companies build authority — across the platforms where buyers now begin their research. ChatGPT. Claude. Perplexity. Gemini. Google AI Overviews. Trade press. Analyst networks. Earned media.'::text AS subtitle,
  pg_read_file('/dev/null', 0, 0) AS dummy,
  ''::text AS body_html,
  '[]'::jsonb AS faq
) x
WHERE false;