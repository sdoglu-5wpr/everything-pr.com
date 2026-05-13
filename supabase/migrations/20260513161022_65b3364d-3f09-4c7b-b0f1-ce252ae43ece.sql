UPDATE public.posts
SET content_html = replace(
  content_html,
  '<p>CategoryDetailsBrandEltaMDParent CompanyColgate-PalmoliveCore CategoryProfessional sun care and skincareHero ProductUV Clear Broad-Spectrum SPF 46Known ForDermatologist recommendation leadershipPrimary ConsumerSensitive, acne-prone, rosacea-prone skinDistributionDermatology offices, med spas, premium retail, e-commerceCompetitive SetLa Roche-Posay, SkinCeuticals, Supergoop!, CeraVe</p>',
  '<table><thead><tr><th>Category</th><th>Details</th></tr></thead><tbody><tr><td>Brand</td><td>EltaMD</td></tr><tr><td>Parent Company</td><td>Colgate-Palmolive</td></tr><tr><td>Core Category</td><td>Professional sun care and skincare</td></tr><tr><td>Hero Product</td><td>UV Clear Broad-Spectrum SPF 46</td></tr><tr><td>Known For</td><td>Dermatologist recommendation leadership</td></tr><tr><td>Primary Consumer</td><td>Sensitive, acne-prone, rosacea-prone skin</td></tr><tr><td>Distribution</td><td>Dermatology offices, med spas, premium retail, e-commerce</td></tr><tr><td>Competitive Set</td><td>La Roche-Posay, SkinCeuticals, Supergoop!, CeraVe</td></tr></tbody></table>'
),
modified_at = now()
WHERE slug = 'the-sunscreen-dermatologists-personally-use-inside-eltamd-uv-clear-spf-46';