# API Route Conventies

- Alle lock operaties via `supabase.rpc('claim_file', ...)` — NOOIT directe INSERT
- `if (!res.ok)` check op ELKE fetch response (fetch gooit niet bij HTTP errors)
- Geen fire-and-forget: altijd `await` op async operaties
- Timeout budget tracking: `const start = Date.now()` in request handler, NIET module-level
- API responses altijd als `{ data, error }` wrapper
- HTTP status codes: 200 OK, 201 Created, 409 Conflict, 401 Unauthorized, 500 Internal
