-- Keep aggregate-stat functions reproducible after moving WhoIsFree data into
-- the dedicated whoisfree schema. The functions are intentionally callable by
-- anonymous visitors because the counters contain no per-user or per-event data.

CREATE OR REPLACE FUNCTION public.increment_total_events()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO whoisfree.global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 1, 0, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    events_created_total = whoisfree.global_stats.events_created_total + 1,
    updated_at = NOW();
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_total_participants()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO whoisfree.global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 0, 1, NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    participants_submitted_total = whoisfree.global_stats.participants_submitted_total + 1,
    updated_at = NOW();
  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_total_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_total_participants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_total_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_total_participants() TO anon, authenticated;
