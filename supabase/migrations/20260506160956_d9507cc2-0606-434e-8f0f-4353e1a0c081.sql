CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule prior run if exists
DO $$
BEGIN
  PERFORM cron.unschedule('publish-scheduled-posts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'publish-scheduled-posts',
  '*/5 * * * *',
  $cron$
  UPDATE public.posts
     SET status = 'publish', modified_at = now()
   WHERE status = 'future'
     AND published_at <= now();
  $cron$
);