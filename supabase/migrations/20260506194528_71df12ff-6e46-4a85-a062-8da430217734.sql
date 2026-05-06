
-- Track every legacy WP image URL actually referenced by a published post,
-- so the media-backfill admin tool only downloads what the site uses.
create table if not exists public.media_backfill_queue (
  url text primary key,
  storage_key text not null,
  status text not null default 'pending',  -- pending | done | failed
  attempts int not null default 0,
  last_error text,
  bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_backfill_queue_status_idx
  on public.media_backfill_queue (status);

alter table public.media_backfill_queue enable row level security;

drop policy if exists "staff read media_backfill_queue" on public.media_backfill_queue;
create policy "staff read media_backfill_queue"
  on public.media_backfill_queue for select
  using (public.is_staff(auth.uid()));

drop policy if exists "staff write media_backfill_queue" on public.media_backfill_queue;
create policy "staff write media_backfill_queue"
  on public.media_backfill_queue for all
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
