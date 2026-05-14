CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE IF NOT EXISTS public.glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  short_definition text NOT NULL,
  extended_html text,
  category text,
  where_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS glossary_terms_category_idx ON public.glossary_terms (category);
CREATE INDEX IF NOT EXISTS glossary_terms_title_lower_idx ON public.glossary_terms ((lower(title)));

ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read glossary_terms" ON public.glossary_terms;
CREATE POLICY "public read glossary_terms"
  ON public.glossary_terms FOR SELECT
  USING (published = true OR is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff write glossary_terms" ON public.glossary_terms;
CREATE POLICY "staff write glossary_terms"
  ON public.glossary_terms FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

DROP TRIGGER IF EXISTS glossary_terms_updated_at ON public.glossary_terms;
CREATE TRIGGER glossary_terms_updated_at
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
