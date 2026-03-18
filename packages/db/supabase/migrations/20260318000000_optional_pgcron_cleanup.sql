-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Cleanup expired locks every 5 minutes
SELECT cron.schedule(
  'preclaim-cleanup-expired-locks',
  '*/5 * * * *',
  $$SELECT public.cleanup_expired_locks()$$
);
