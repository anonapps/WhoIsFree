-- Ensure all-time stats live in the privacy-preserving global_stats singleton.
-- The table stores only aggregate counters and never event IDs, participant names,
-- IPs, links, or per-event details.

CREATE TABLE IF NOT EXISTS global_stats (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  events_created_total BIGINT NOT NULL DEFAULT 0,
  participants_submitted_total BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO global_stats (id, events_created_total, participants_submitted_total)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Preserve aggregate values from the older stats_global table if that migration
-- has already run. This copies only aggregate counters, not active event data.
DO $$
BEGIN
  IF to_regclass('public.stats_global') IS NOT NULL THEN
    UPDATE global_stats AS gs
    SET
      events_created_total = GREATEST(gs.events_created_total, COALESCE(sg.total_events, 0)),
      participants_submitted_total = GREATEST(gs.participants_submitted_total, COALESCE(sg.total_participants, 0)),
      updated_at = NOW()
    FROM stats_global AS sg
    WHERE gs.id = 1
      AND sg.id = 1;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_total_events()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 1, 0, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    events_created_total = global_stats.events_created_total + 1,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION increment_total_participants()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 0, 1, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    participants_submitted_total = global_stats.participants_submitted_total + 1,
    updated_at = NOW();
END;
$$;

GRANT SELECT ON global_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_participants() TO anon, authenticated;
