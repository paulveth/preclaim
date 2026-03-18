# preclaim_

**One file. One agent. Zero conflicts.**

Predictive file locking for AI coding agents. Preclaim prevents merge conflicts when multiple AI agents work on the same codebase — before they happen.

```
Agent A: edit src/auth.ts  →  preclaim: ✓ locked for you
Agent B: edit src/auth.ts  →  preclaim: ✗ conflict — locked by Agent A
Agent A: git commit         →  preclaim: locks released
```

## How It Works

1. **Install & init** — One command sets up auth, creates your project, and installs Claude Code hooks.
2. **Code as usual** — Your AI agent edits files normally. Preclaim intercepts writes and atomically locks each file — invisible until it matters.
3. **Collaborate safely** — Multiple agents, one codebase. Conflicts are prevented at the source.

Locks are atomic (via Supabase RPC), fail-open on network errors, and resolve within 2 seconds.

## Quick Start

```bash
npm i -g preclaim
preclaim init
```

That's it. `preclaim init` handles authentication (GitHub OAuth), project creation, and hook installation.

## CLI Commands

| Command | Description |
|---|---|
| `preclaim init` | Initialize project — auth, onboarding, hook install |
| `preclaim login` | Authenticate via GitHub OAuth |
| `preclaim status` | Show active locks for the current project |
| `preclaim lock <file>` | Manually lock a file |
| `preclaim unlock [file]` | Release locks (specific file or all) |
| `preclaim check <files...>` | Check lock status for specific files |
| `preclaim whoami` | Display current user info |
| `preclaim config` | View/modify project configuration |
| `preclaim install-hooks` | Install Claude Code hooks |

## Claude Code Hooks

Preclaim integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) via hooks:

| Hook | Trigger | Action |
|---|---|---|
| **PreToolUse** | Agent writes a file | Claims a lock — blocks if another agent holds it |
| **PostToolUse** | Agent runs `git commit` | Auto-releases all session locks |
| **SessionStart** | New Claude Code session | Registers session, starts heartbeat daemon |
| **Stop** | Session ends | Cleans up session and releases locks |

The **heartbeat daemon** runs in the background, extending lock TTLs every 60 seconds so locks don't expire during long sessions.

## Configuration

Preclaim creates a `.preclaim.json` in your project root:

```json
{
  "version": 1,
  "projectId": "<project-id>",
  "backend": "https://preclaim.dev",
  "ttl": 30,
  "failOpen": true,
  "ignore": ["*.md", "package-lock.json", "*.test.ts"]
}
```

| Option | Description | Default |
|---|---|---|
| `ttl` | Lock time-to-live in minutes | `30` |
| `failOpen` | Allow edits when the backend is unreachable | `true` |
| `ignore` | Glob patterns for files that don't need locking | — |

Credentials are stored at `~/.preclaim/credentials.json`.

## Architecture

```
packages/
  core/    # Shared types, API client, config       (@preclaim/core)
  cli/     # CLI tool + Claude Code hooks            (preclaim)
  db/      # Supabase types + migrations             (@preclaim/db)
apps/
  web/     # Next.js API routes + dashboard          (@preclaim/web)
```

### Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript (ES2022) |
| API | Next.js API routes / Vercel |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| CLI | Node.js + Commander.js |
| Validation | Zod |
| Build | Turborepo + pnpm |
| Tests | Vitest |

### Lock Lifecycle

```
PreToolUse hook
  → POST /api/v1/locks
    → supabase.rpc('claim_file')
      → FOR UPDATE (atomic, blocking)
        → acquired | already_held | conflict
```

Locks expire via TTL (default: 30 min). A background daemon extends TTLs during active sessions. `git commit` auto-releases all locks. Crashed sessions are cleaned up by `pg_cron` every 5 minutes.

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm dev            # Dev mode (watch)
pnpm test           # Run tests
pnpm lint           # ESLint
pnpm typecheck      # TypeScript check
```

Requires Node.js 22+ and pnpm 10.6.5+.

## License

MIT
