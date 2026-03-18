-- Enable realtime on lock_history for dashboard activity feed
-- REPLICA IDENTITY FULL is vereist voor realtime subscriptions
-- ALTER PUBLICATION voegt de tabel toe aan het realtime kanaal

ALTER TABLE IF EXISTS lock_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE lock_history;
