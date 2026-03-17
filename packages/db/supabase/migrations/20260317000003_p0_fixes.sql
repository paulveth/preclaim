-- P0 Fixes: race condition, SECURITY DEFINER, lock_history INSERT policy

-- Fix 1: claim_file — FOR UPDATE (was FOR UPDATE SKIP LOCKED) + SECURITY DEFINER
-- SKIP LOCKED is voor job queues (worker pakt volgende job).
-- File claims moeten blokkeren: tweede caller wacht tot eerste klaar is.
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
BEGIN
  v_expires := now() + (p_ttl_minutes || ' minutes')::INTERVAL;

  SELECT * INTO v_existing
  FROM locks
  WHERE project_id = p_project_id AND file_path = p_file_path
  FOR UPDATE;

  -- Geen lock → claim
  IF NOT FOUND THEN
    INSERT INTO locks (project_id, file_path, session_id, user_id, expires_at)
    VALUES (p_project_id, p_file_path, p_session_id, p_user_id, v_expires);

    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, p_file_path, p_user_id, p_session_id, 'claude-code', 'acquire');

    RETURN jsonb_build_object('status', 'acquired', 'expires_at', v_expires);
  END IF;

  -- Lock verlopen → claim overnemen
  IF v_existing.expires_at < now() THEN
    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, v_existing.file_path, v_existing.user_id, v_existing.session_id, 'claude-code', 'expire');

    UPDATE locks
    SET session_id = p_session_id, user_id = p_user_id, acquired_at = now(), expires_at = v_expires, message = NULL
    WHERE id = v_existing.id;

    INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
    VALUES (p_project_id, p_file_path, p_user_id, p_session_id, 'claude-code', 'acquire');

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

-- Fix 2: cleanup_expired_locks — SECURITY DEFINER
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    DELETE FROM locks
    WHERE expires_at < now()
    RETURNING *
  )
  INSERT INTO lock_history (project_id, file_path, user_id, session_id, provider, action)
  SELECT e.project_id, e.file_path, e.user_id, e.session_id,
         COALESCE(s.provider, 'unknown'), 'expire'
  FROM expired e
  LEFT JOIN sessions s ON s.id = e.session_id;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: INSERT policy op lock_history
-- RPCs gebruiken SECURITY DEFINER (bypast RLS), maar API routes
-- die direct in lock_history inserten hebben een INSERT policy nodig.
DROP POLICY IF EXISTS "lock_history_insert" ON lock_history;
CREATE POLICY "lock_history_insert" ON lock_history FOR INSERT
  WITH CHECK (user_id = auth.uid());
