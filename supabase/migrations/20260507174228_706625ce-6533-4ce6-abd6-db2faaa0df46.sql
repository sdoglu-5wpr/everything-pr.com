INSERT INTO public.redirects (source_path, target_path, status_code, enabled) VALUES
  ('/marijuana','/cannabis',301,true),
  ('/marijuana/','/cannabis',301,true),
  ('/sportsbetting','/gambling',301,true),
  ('/sportsbetting/','/gambling',301,true)
ON CONFLICT DO NOTHING;