-- Upgrade admin token strength and add event auto-purge support

ALTER TABLE events
  ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;

ALTER TABLE events
  ALTER COLUMN admin_id SET DEFAULT encode(gen_random_bytes(32), 'hex');

CREATE OR REPLACE FUNCTION purge_expired_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-events-hourly'
    ) THEN
      PERFORM cron.schedule(
        'purge-expired-events-hourly',
        '0 * * * *',
        $job$SELECT purge_expired_events();$job$
      );
    END IF;
  END IF;
END;
$$;
