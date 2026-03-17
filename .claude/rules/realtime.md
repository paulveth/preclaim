# Realtime Gotchas

- ALTIJD `REPLICA IDENTITY FULL` op tabellen met realtime subscriptions
- ALTIJD polling fallback (5s) naast realtime (mist events bij reconnect)
- `ALTER PUBLICATION supabase_realtime ADD TABLE <table>` vergeten = stille failure
- Realtime channels moeten expliciet unsubscribed worden bij cleanup
- Optimistic updates voor UI, maar altijd valideren tegen server state
