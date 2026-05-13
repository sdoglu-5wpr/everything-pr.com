UPDATE public.authors
SET bio = REPLACE(bio, 'e-CreativeAgency.com', '<a href="https://e-creativeagency.com" target="_blank" rel="noopener noreferrer">e-CreativeAgency.com</a>'),
    updated_at = now()
WHERE slug = 'eduard-moraru'
  AND bio NOT LIKE '%href="https://e-creativeagency.com"%';