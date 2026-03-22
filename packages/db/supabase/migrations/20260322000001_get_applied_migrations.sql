-- RPC voor CI: geeft toegepaste migratie-versies terug
-- Wordt aangeroepen door release-check workflow via REST API

CREATE OR REPLACE FUNCTION get_applied_migrations()
RETURNS TABLE(version TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT version::TEXT
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
$$ LANGUAGE sql STABLE;
