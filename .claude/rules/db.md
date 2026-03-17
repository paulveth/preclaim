# Database Regels

## Migraties
- Bestandsnaam: `YYYYMMDDHHMMSS_beschrijving.sql`
- Altijd `IF NOT EXISTS` / `IF EXISTS` checks
- RLS policies in dezelfde migratie als de tabel
- Na nieuwe kolommen: ALTIJD migratie pushen VOOR deploy

## RLS Patterns
- Elke tabel: RLS enabled, geen uitzonderingen
- Helper functies voor herbruikbare checks (`get_user_org_id()`, `is_org_admin()`)
- INSERT policies: vergeet ze niet (silent failures bij ontbrekende policies)

## RPCs
- `SECURITY DEFINER` + `SET search_path = public` op functies die meerdere tabellen raken
- `FOR UPDATE` voor exclusieve resources (file claims)
- `FOR UPDATE SKIP LOCKED` alleen voor job queues (workers pakken volgende job)
- ALLE kolommen in `RETURNS` / `jsonb_build_object`

## Supabase Gotchas
- `.delete().select()` geeft GEEN count — gebruik `{ count: 'exact' }` in `.delete()`
- PostgREST: elke query = HTTP roundtrip. Bulk > loop.
- RLS faalt stilzwijgend bij ontbrekende policies (geen error, lege result)
- `ALTER PUBLICATION supabase_realtime ADD TABLE <table>` vergeten = stille failure
- `REPLICA IDENTITY FULL` vereist voor realtime op tabellen
