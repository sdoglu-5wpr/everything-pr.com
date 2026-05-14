INSERT INTO public.redirects (source_path, target_path, status_code, enabled, notes)
VALUES ('/generative-engine-optimization', '/geo', 301, true, 'Phase 1e — GEO pillar slug rename')
ON CONFLICT DO NOTHING;