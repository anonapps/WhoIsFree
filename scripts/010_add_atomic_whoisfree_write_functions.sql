-- Make anonymous event creation and vote submission atomic.
-- After this migration, the application does not need direct INSERT access
-- to participant/response tables or direct access to aggregate increment RPCs.

CREATE OR REPLACE FUNCTION public.create_whoisfree_event(
  p_title TEXT,
  p_description TEXT,
  p_instructions TEXT,
  p_duration INTEGER,
  p_timezone TEXT,
  p_voting_deadline_days INTEGER,
  p_advanced_mode_enabled BOOLEAN,
  p_admin_id TEXT,
  p_voting_deadline TIMESTAMPTZ,
  p_deletion_time TIMESTAMPTZ,
  p_time_slots TIMESTAMPTZ[]
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid title';
  END IF;
  IF p_duration < 30 OR p_duration > 1440 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;
  IF p_voting_deadline_days < 1 OR p_voting_deadline_days > 5 THEN
    RAISE EXCEPTION 'Invalid voting deadline';
  END IF;
  IF length(COALESCE(p_admin_id, '')) < 32 THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  IF COALESCE(array_length(p_time_slots, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one time slot is required';
  END IF;

  INSERT INTO whoisfree.events (
    title, description, instructions, duration, timezone,
    voting_deadline_days, advanced_mode_enabled, voting_deadline,
    deletion_time, admin_id, expires_at
  )
  VALUES (
    trim(p_title), p_description, p_instructions, p_duration, p_timezone,
    p_voting_deadline_days, COALESCE(p_advanced_mode_enabled, FALSE),
    p_voting_deadline, p_deletion_time, p_admin_id, p_deletion_time
  )
  RETURNING id INTO v_event_id;

  INSERT INTO whoisfree.time_slots (event_id, start_time)
  SELECT v_event_id, slot_time
  FROM unnest(p_time_slots) AS slot_time;

  INSERT INTO whoisfree.global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 1, 0, NOW())
  ON CONFLICT (id) DO UPDATE
  SET events_created_total = whoisfree.global_stats.events_created_total + 1,
      updated_at = NOW();

  RETURN json_build_object('eventId', v_event_id, 'adminId', p_admin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_whoisfree_votes(
  p_event_id UUID,
  p_name TEXT,
  p_votes JSONB
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_participant_id UUID;
  v_event whoisfree.events%ROWTYPE;
  v_inserted_count INTEGER := 0;
  v_expected_count INTEGER := jsonb_array_length(COALESCE(p_votes, '[]'::jsonb));
BEGIN
  IF length(trim(COALESCE(p_name, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid participant name';
  END IF;

  SELECT * INTO v_event
  FROM whoisfree.events e
  WHERE e.id = p_event_id;

  IF v_event.id IS NULL
     OR v_event.is_closed
     OR (v_event.deletion_time IS NOT NULL AND v_event.deletion_time <= NOW())
     OR (v_event.voting_deadline IS NOT NULL AND v_event.voting_deadline <= NOW()) THEN
    RAISE EXCEPTION 'This event is no longer available';
  END IF;

  INSERT INTO whoisfree.participants (event_id, name)
  VALUES (p_event_id, trim(p_name))
  RETURNING id INTO v_participant_id;

  IF v_expected_count > 0 THEN
    INSERT INTO whoisfree.responses (participant_id, time_slot_id, vote_type)
    SELECT v_participant_id, v.slot_id, v.vote_type
    FROM jsonb_to_recordset(p_votes) AS v(slot_id UUID, vote_type TEXT)
    WHERE EXISTS (
      SELECT 1
      FROM whoisfree.time_slots ts
      WHERE ts.id = v.slot_id
        AND ts.event_id = p_event_id
        AND ts.is_disabled = FALSE
    );

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    IF v_inserted_count <> v_expected_count THEN
      RAISE EXCEPTION 'One or more selected time slots are invalid';
    END IF;
  END IF;

  INSERT INTO whoisfree.global_stats (id, events_created_total, participants_submitted_total, updated_at)
  VALUES (1, 0, 1, NOW())
  ON CONFLICT (id) DO UPDATE
  SET participants_submitted_total = whoisfree.global_stats.participants_submitted_total + 1,
      updated_at = NOW();

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_whoisfree_event(TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_whoisfree_votes(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_whoisfree_event(TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ[]) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_whoisfree_votes(UUID, TEXT, JSONB) TO anon;

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.can_submit_whoisfree_response(p_participant_id UUID, p_time_slot_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM whoisfree.participants p
    JOIN whoisfree.events e ON e.id = p.event_id
    JOIN whoisfree.time_slots ts ON ts.event_id = e.id
    WHERE p.id = p_participant_id
      AND ts.id = p_time_slot_id
      AND e.is_closed = FALSE
      AND (e.deletion_time IS NULL OR e.deletion_time > NOW())
      AND (e.voting_deadline IS NULL OR e.voting_deadline > NOW())
      AND ts.is_disabled = FALSE
  );
$$;
REVOKE ALL ON FUNCTION private.can_submit_whoisfree_response(UUID, UUID) FROM PUBLIC;

DROP POLICY IF EXISTS public_can_submit_responses ON whoisfree.responses;
CREATE POLICY public_can_submit_responses
  ON whoisfree.responses FOR INSERT TO anon, authenticated
  WITH CHECK ((SELECT private.can_submit_whoisfree_response(participant_id, time_slot_id)));

REVOKE EXECUTE ON FUNCTION public.can_submit_whoisfree_response(UUID, UUID) FROM anon, authenticated, PUBLIC;

-- The application now writes through the two atomic RPCs above.
REVOKE INSERT ON whoisfree.events FROM anon, authenticated;
REVOKE INSERT ON whoisfree.time_slots FROM anon, authenticated;
REVOKE INSERT ON whoisfree.participants FROM anon, authenticated;
REVOKE INSERT ON whoisfree.responses FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_total_events() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_total_participants() FROM anon, authenticated;
