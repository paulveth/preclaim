-- Preclaim Initial Schema
-- Atomic lock coordination for AI coding agents

-- Organisaties
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Users (via Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  org_id      UUID REFERENCES organizations(id),
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Projecten (repos)
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  repo_url    TEXT,
  default_ttl INTEGER DEFAULT 30,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Sessies (actieve AI agent sessies)
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) NOT NULL,
  project_id      UUID REFERENCES projects(id) NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'claude-code',
  started_at      TIMESTAMPTZ DEFAULT now(),
  last_heartbeat  TIMESTAMPTZ DEFAULT now(),
  metadata        JSONB DEFAULT '{}'
);

-- Locks (kerntabel)
CREATE TABLE IF NOT EXISTS locks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) NOT NULL,
  file_path   TEXT NOT NULL,
  session_id  TEXT REFERENCES sessions(id) NOT NULL,
  user_id     UUID REFERENCES profiles(id) NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  message     TEXT,
  UNIQUE(project_id, file_path)
);

-- Lock history (audit trail)
CREATE TABLE IF NOT EXISTS lock_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) NOT NULL,
  file_path   TEXT NOT NULL,
  user_id     UUID REFERENCES profiles(id) NOT NULL,
  session_id  TEXT NOT NULL,
  provider    TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('acquire', 'release', 'expire', 'force_release')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locks_project_file ON locks(project_id, file_path);
CREATE INDEX IF NOT EXISTS idx_locks_session ON locks(session_id);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat ON sessions(last_heartbeat);

-- Realtime publicatie
ALTER PUBLICATION supabase_realtime ADD TABLE locks;
ALTER TABLE locks REPLICA IDENTITY FULL;

-- Atomic claim RPC
CREATE OR REPLACE FUNCTION claim_file(
  p_project_id UUID,
  p_file_path TEXT,
  p_session_id TEXT,
  p_user_id UUID,
  p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_expires TIMESTAMPTZ;
BEGIN
  v_expires := now() + (p_ttl_minutes || ' minutes')::INTERVAL;

  SELECT * INTO v_existing
  FROM locks
  WHERE project_id = p_project_id AND file_path = p_file_path
  FOR UPDATE SKIP LOCKED;

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

-- Auto-cleanup expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
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
