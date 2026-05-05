-- Import jobs table tracks WordPress sync runs with progress polling
CREATE TYPE public.import_job_status AS ENUM ('pending','running','completed','failed','cancelled');
CREATE TYPE public.import_job_phase AS ENUM ('authors','categories','tags','media','posts','pages','done');

CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.import_job_status NOT NULL DEFAULT 'pending',
  phase public.import_job_phase NOT NULL DEFAULT 'authors',
  page integer NOT NULL DEFAULT 1,
  per_page integer NOT NULL DEFAULT 20,
  download_media boolean NOT NULL DEFAULT true,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  inserted jsonb NOT NULL DEFAULT '{}'::jsonb,
  skipped jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read import_jobs" ON public.import_jobs FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write import_jobs" ON public.import_jobs FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_import_jobs_updated BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- Public storage bucket for migrated WordPress media
INSERT INTO storage.buckets (id, name, public) VALUES ('wp-media', 'wp-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read wp-media" ON storage.objects FOR SELECT USING (bucket_id = 'wp-media');
CREATE POLICY "staff write wp-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wp-media' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update wp-media" ON storage.objects FOR UPDATE USING (bucket_id = 'wp-media' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete wp-media" ON storage.objects FOR DELETE USING (bucket_id = 'wp-media' AND public.is_staff(auth.uid()));