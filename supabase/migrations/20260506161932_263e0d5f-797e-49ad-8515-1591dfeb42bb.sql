-- Schedule auto-generation of featured images for posts that don't have one.
-- Runs every 10 minutes, processes up to 5 posts per run via the public hook.
SELECT cron.unschedule('generate-missing-featured-images')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-missing-featured-images');

SELECT cron.schedule(
  'generate-missing-featured-images',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://everythingpr.lovable.app/api/public/hooks/generate-missing-featured-images?limit=5&future=1',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWNmc2N2c2NrZ3hib2hlcnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDY1MzQsImV4cCI6MjA5MzUyMjUzNH0._b6z7wZnoQYRWsLDUXA5F6pGAT4O_Lerp961HD0Nu4w"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);