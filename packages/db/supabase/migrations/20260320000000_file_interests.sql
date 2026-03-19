-- Soft Signals: file_interests tabel voor read-activiteit tracking
-- Ephemere registraties met TTL, geen hard locks

-- ─── TABEL ───

CREATE TABLE IF NOT EXISTS file_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '60 seconds',
  UNIQUE(project_id, file_path, session_id)
);

CREATE INDEX IF NOT EXISTS idx_file_interests_project_file
  ON file_interests(project_id, file_path);
CREATE INDEX IF NOT EXISTS idx_file_interests_expires
  ON file_interests(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_interests_session
  ON file_interests(session_id);

-- ─── RLS ───

ALTER TABLE file_interests ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped (zelfde patroon als locks)
CREATE POLICY "file_interests_select" ON file_interests FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE org_id = get_user_org_id()
  ));

-- INSERT: eigen user_id
CREATE POLICY "file_interests_insert" ON file_interests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: eigen user_id (voor UPSERT TTL refresh)
CREATE POLICY "file_interests_update" ON file_interests FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: eigen user_id of admin
CREATE POLICY "file_interests_delete" ON file_interests FOR DELETE
  USING (user_id = auth.uid() OR is_org_admin());

-- ─── REALTIME ───

ALTER TABLE file_interests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE file_interests;

-- ─── RPC: register_file_interest ───

CREATE OR REPLACE FUNCTION register_file_interest(
  p_project_id UUID,
  p_file_path TEXT,
  p_session_id TEXT,
  p_user_id UUID,
  p_ttl_seconds INTEGER DEFAULT 60
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO file_interests (project_id, file_path, session_id, user_id, expires_at)
  VALUES (p_project_id, p_file_path, p_session_id, p_user_id, now() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (project_id, file_path, session_id)
  DO UPDATE SET expires_at = now() + (p_ttl_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ─── EXTEND CLEANUP ───

CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Cleanup expired locks (bestaande logica)
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

  -- Cleanup expired file interests
  DELETE FROM file_interests WHERE expires_at < now();

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
