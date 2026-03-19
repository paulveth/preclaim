# Preclaim

AI File Coordination Layer — predictieve file locking voor AI coding agents.

## Stack

| Laag      | Technologie                          |
|-----------|--------------------------------------|
| Runtime   | Node.js + TypeScript (ES2022 strict) |
| API       | Next.js API routes / Vercel          |
| DB        | Supabase (PostgreSQL + Auth + RLS)   |
| CLI       | Node.js, npm package                 |
| Validatie | Zod (API routes)                     |
| Test      | Vitest                               |

## Monorepo

```
packages/
  core/    # Gedeelde types, API client, config, docs (@preclaim/core)
  cli/     # CLI tool + Claude Code hooks (preclaim)
  mcp/     # MCP server voor elke MCP-compatible agent (@preclaim/mcp)
  db/      # Supabase types + migraties (@preclaim/db)
apps/
  web/     # Next.js API routes + dashboard (@preclaim/web)
```

## Commando's

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm dev            # Dev mode
pnpm test           # Tests draaien
pnpm lint           # ESLint
pnpm typecheck      # TypeScript check
```

## Docs als Single Source of Truth

`packages/core/src/docs.ts` bevat alle beschrijvingen voor CLI commando's, MCP tools, hooks en config. CLI en MCP server importeren hieruit — nooit beschrijvingen hardcoden.

## Key Patterns

- Atomic lock operations via Supabase RPC (`claim_file`), nooit directe INSERT
- Fail-open on network errors (hooks mogen development nooit blokkeren)
- Hook latency < 2 seconden
- Altijd `await` op async operaties, geen fire-and-forget
- RLS op elke tabel, geen uitzonderingen
- `SECURITY DEFINER` + `SET search_path = public` op RPCs die meerdere tabellen raken
- IF NOT EXISTS in alle migraties
- Realtime + polling fallback (5s)

## Kritieke Regels

- `FOR UPDATE` (blokkend) voor file claims, NOOIT `SKIP LOCKED`
- Lock paths altijd relatief ten opzichte van project root
- Token refresh voor sessies > 1 uur
- Bulk operations voor heartbeat updates, NOOIT N+1 loops
- Zod validatie op alle API routes (systeemgrenzen)
- Provider niet hardcoden — `claim_file` RPC haalt provider op uit `sessions` tabel
- `preclaim init` detecteert agents automatisch (Claude Code, Cursor, Windsurf, Cline)
