-- Add countdown timestamps and global stats counters

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS voting_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_time TIMESTAMPTZ;

-- Keep legacy events safe by deriving timestamps when null.
UPDATE events
SET voting_deadline = created_at + (voting_deadline_days || ' days')::INTERVAL
WHERE voting_deadline IS NULL;

UPDATE events
SET deletion_time = COALESCE(expires_at, created_at + INTERVAL '14 days')
WHERE deletion_time IS NULL;

-- Keep legacy expiration behavior aligned with new deletion timestamp.
UPDATE events
SET expires_at = deletion_time
WHERE expires_at IS DISTINCT FROM deletion_time;

CREATE TABLE IF NOT EXISTS stats_global (
  id INTEGER PRIMARY KEY,
  total_events BIGINT NOT NULL DEFAULT 0,
  total_participants BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO stats_global (id, total_events, total_participants)
VALUES (
  1,
  (SELECT COUNT(*) FROM events),
  (SELECT COUNT(*) FROM participants)
)
ON CONFLICT (id) DO UPDATE
SET
  total_events = EXCLUDED.total_events,
  total_participants = EXCLUDED.total_participants,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION increment_total_events()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO stats_global (id, total_events, total_participants, updated_at)
  VALUES (1, 1, 0, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    total_events = stats_global.total_events + 1,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION increment_total_participants()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO stats_global (id, total_events, total_participants, updated_at)
  VALUES (1, 0, 1, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    total_participants = stats_global.total_participants + 1,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION purge_expired_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE deletion_time IS NOT NULL
    AND deletion_time <= NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
