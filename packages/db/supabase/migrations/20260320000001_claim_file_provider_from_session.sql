-- Fix: claim_file haalt provider op uit sessions tabel i.p.v. hardcoded 'claude-code'
-- Backward compatible: sessies zonder provider vallen terug op 'unknown'

CREATE OR REPLACE FUNCTION claim_file(
  p_project_id UUID,
  p_file_path TEXT,
  p_session_id TEXT,
  p_user_id UUID,
  p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_expires TIMESTAMPTZ;
  v_provider TEXT;
BEGIN
  v_expires := now() + (p_ttl_minutes || ' minutes')::INTERVAL;

  -- Haal provider op uit session
  SELECT provider INTO v_provider FROM sessions WHERE id = p_session_id;
  v_provider := COALESCE(v_provider, 'unknown');

  SELECT * INTO v_existing
  FROM locks
  WHERE project_id = p_project_id AND file_path = p_file_path
  FOR UPDATE;

  -- Geen lock → claim
  IF NOT FOUND THEN
    INSERT INTO locks (project_id, file_path, session_id, user_id, expires_at)
    VALUES (p_project_id, p_file_path, p_session_id, p_user_id, v_expires);

    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, p_file_path, p_user_id, p_session_id, v_provider, 'acquire');

    RETURN jsonb_build_object('status', 'acquired', 'expires_at', v_expires);
  END IF;

  -- Lock verlopen → claim overnemen
  IF v_existing.expires_at < now() THEN
    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, v_existing.file_path, v_existing.user_id, v_existing.session_id, v_provider, 'expire');

    UPDATE locks
    SET session_id = p_session_id, user_id = p_user_id, acquired_at = now(), expires_at = v_expires, message = NULL
    WHERE id = v_existing.id;

    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, p_file_path, p_user_id, p_session_id, v_provider, 'acquire');

    RETURN jsonb_build_object('status', 'acquired', 'expires_at', v_expires);
  END IF;

  -- Zelfde sessie → extend TTL
  IF v_existing.session_id = p_session_id THEN
    UPDATE locks SET expires_at = v_expires WHERE id = v_existing.id;
    RETURN jsonb_build_object('status', 'already_held', 'expires_at', v_expires);
  END IF;

  -- Lock van iemand anders → conflict
  RETURN jsonb_build_object(
    'status', 'conflict',
    'holder', jsonb_build_object(
      'user_id', v_existing.user_id,
      'session_id', v_existing.session_id,
      'acquired_at', v_existing.acquired_at,
      'expires_at', v_existing.expires_at
    )
  );
END;
$$ LANGUAGE plpgsql;
