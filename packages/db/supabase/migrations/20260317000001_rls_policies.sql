-- RLS Policies for Preclaim

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_history ENABLE ROW LEVEL SECURITY;

-- Helper functies
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND is_org_admin());

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (org_id = get_user_org_id() OR id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Projects
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (org_id = get_user_org_id() AND is_org_admin());

-- Sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE org_id = get_user_org_id()
  ));

CREATE POLICY "sessions_insert" ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_update" ON sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "sessions_delete" ON sessions FOR DELETE
  USING (user_id = auth.uid());

-- Locks
CREATE POLICY "locks_select" ON locks FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE org_id = get_user_org_id()
  ));

CREATE POLICY "locks_insert" ON locks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "locks_delete" ON locks FOR DELETE
  USING (user_id = auth.uid() OR is_org_admin());

-- Lock History
CREATE POLICY "lock_history_select" ON lock_history FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE org_id = get_user_org_id()
  ));
