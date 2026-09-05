-- Harden WhoIsFree's anonymous link-based access model.
-- Public users may read event metadata and available slots, and submit responses.
-- Participant names/responses are never directly readable through PostgREST.

ALTER TABLE whoisfree.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoisfree.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoisfree.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoisfree.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoisfree.global_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_can_read_active_events ON whoisfree.events;
CREATE POLICY public_can_read_active_events
  ON whoisfree.events FOR SELECT TO anon, authenticated
  USING (deletion_time IS NULL OR deletion_time > NOW());

DROP POLICY IF EXISTS public_can_create_events ON whoisfree.events;
CREATE POLICY public_can_create_events
  ON whoisfree.events FOR INSERT TO anon, authenticated
  WITH CHECK (
    title IS NOT NULL
    AND length(trim(title)) BETWEEN 1 AND 200
    AND duration BETWEEN 30 AND 1440
    AND voting_deadline_days BETWEEN 1 AND 5
    AND length(admin_id) >= 32
  );

DROP POLICY IF EXISTS public_can_read_active_time_slots ON whoisfree.time_slots;
CREATE POLICY public_can_read_active_time_slots
  ON whoisfree.time_slots FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM whoisfree.events e
      WHERE e.id = time_slots.event_id
        AND (e.deletion_time IS NULL OR e.deletion_time > NOW())
    )
  );

DROP POLICY IF EXISTS public_can_create_time_slots ON whoisfree.time_slots;
CREATE POLICY public_can_create_time_slots
  ON whoisfree.time_slots FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whoisfree.events e
      WHERE e.id = time_slots.event_id
        AND (e.deletion_time IS NULL OR e.deletion_time > NOW())
    )
  );

DROP POLICY IF EXISTS public_can_submit_participants ON whoisfree.participants;
CREATE POLICY public_can_submit_participants
  ON whoisfree.participants FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(name)) BETWEEN 1 AND 200
    AND EXISTS (
      SELECT 1 FROM whoisfree.events e
      WHERE e.id = participants.event_id
        AND (e.deletion_time IS NULL OR e.deletion_time > NOW())
        AND (e.voting_deadline IS NULL OR e.voting_deadline > NOW())
        AND e.is_closed = FALSE
    )
  );

DROP POLICY IF EXISTS public_can_submit_responses ON whoisfree.responses;
CREATE POLICY public_can_submit_responses
  ON whoisfree.responses FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM whoisfree.participants p
      JOIN whoisfree.events e ON e.id = p.event_id
      JOIN whoisfree.time_slots ts ON ts.event_id = e.id
      WHERE p.id = responses.participant_id
        AND ts.id = responses.time_slot_id
        AND e.is_closed = FALSE
        AND (e.deletion_time IS NULL OR e.deletion_time > NOW())
        AND (e.voting_deadline IS NULL OR e.voting_deadline > NOW())
        AND ts.is_disabled = FALSE
    )
  );

-- No direct participant/response SELECT/UPDATE/DELETE policies are created.
-- The admin dashboard uses the protected RPC below.

DROP POLICY IF EXISTS public_can_read_global_stats ON whoisfree.global_stats;
CREATE POLICY public_can_read_global_stats
  ON whoisfree.global_stats FOR SELECT TO anon, authenticated
  USING (id = 1);

CREATE OR REPLACE FUNCTION public.get_whoisfree_participant_count(p_event_id UUID)
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT count(*)
  FROM whoisfree.participants p
  JOIN whoisfree.events e ON e.id = p.event_id
  WHERE p.event_id = p_event_id
    AND (e.deletion_time IS NULL OR e.deletion_time > NOW());
$$;

CREATE OR REPLACE FUNCTION public.get_whoisfree_admin_data(p_event_id UUID, p_admin_key TEXT)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN e.id IS NULL THEN NULL::jsonb
    ELSE jsonb_build_object(
      'event', to_jsonb(e),
      'time_slots', COALESCE((SELECT jsonb_agg(to_jsonb(ts) ORDER BY ts.start_time)
        FROM whoisfree.time_slots ts WHERE ts.event_id = e.id), '[]'::jsonb),
      'participants', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.submitted_at)
        FROM whoisfree.participants p WHERE p.event_id = e.id), '[]'::jsonb),
      'responses', COALESCE((SELECT jsonb_agg(to_jsonb(r))
        FROM whoisfree.responses r
        JOIN whoisfree.participants p ON p.id = r.participant_id
        WHERE p.event_id = e.id), '[]'::jsonb)
    )
  END
  FROM whoisfree.events e
  WHERE e.id = p_event_id
    AND e.admin_id = p_admin_key
    AND (e.deletion_time IS NULL OR e.deletion_time > NOW());
$$;

CREATE OR REPLACE FUNCTION public.delete_whoisfree_event(p_event_id UUID, p_admin_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM whoisfree.events
  WHERE id = p_event_id AND admin_id = p_admin_key;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_whoisfree_participant_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whoisfree_admin_data(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_whoisfree_event(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_whoisfree_participant_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_whoisfree_admin_data(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_whoisfree_event(UUID, TEXT) TO anon, authenticated;

-- Existing aggregate SECURITY DEFINER functions use schema-qualified tables and
-- a pinned empty search_path to prevent search_path hijacking.
ALTER FUNCTION public.increment_total_events() SET search_path = '';
ALTER FUNCTION public.increment_total_participants() SET search_path = '';
REVOKE ALL ON FUNCTION public.increment_total_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_total_participants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_total_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_total_participants() TO anon, authenticated;
