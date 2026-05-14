-- Add per-pillar robots override + insert 10 vertical landing pages
ALTER TABLE public.pillars ADD COLUMN IF NOT EXISTS robots TEXT;