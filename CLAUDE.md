# Preclaim

AI File Coordination Layer — predictieve file locking voor AI coding agents.

## Stack
- pnpm monorepo + Turborepo
- Supabase (database + auth + realtime)
- Next.js (Vercel serverless API + dashboard)
- TypeScript everywhere

## Build & Dev
```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm dev            # Dev mode
```

## Architecture
- `packages/core` — shared types + API client (@preclaim/core)
- `packages/cli` — CLI tool + Claude Code hooks (preclaim)
- `packages/db` — Supabase types + migrations (@preclaim/db)
- `apps/web` — Next.js app (API + dashboard + marketing)

## Key Patterns
- Atomic lock operations via Supabase RPC (`claim_file`), never direct INSERT
- Fail-open on network errors (hooks must not block development)
- Hook latency must be < 2 seconds
- Always `await` async operations, no fire-and-forget
- RLS everywhere with helper functions
- IF NOT EXISTS in all migrations
- Realtime + polling fallback (5s)
