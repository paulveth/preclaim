-- Fix: ontbrekende INSERT RLS policy op lock_history
-- Zonder deze policy falen alle directe inserts (releases, force_releases)
-- terwijl alleen SECURITY DEFINER functies (claim_file, cleanup) konden schrijven.

-- INSERT policy: eigen user_id (zelfde patroon als locks_insert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lock_history' AND policyname = 'lock_history_insert'
  ) THEN
    CREATE POLICY "lock_history_insert" ON lock_history FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;
