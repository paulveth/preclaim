# preclaim_

**One file. One agent. Zero conflicts.**

Predictive file locking for AI coding agents. Preclaim prevents merge conflicts when multiple AI agents work on the same codebase — before they happen.

```
Agent A: edit src/auth.ts  →  preclaim: ✓ locked for you
Agent B: edit src/auth.ts  →  preclaim: ✗ conflict — locked by Agent A
Agent B: unlock --force     →  preclaim: ✓ force-released
Agent A: git commit         →  preclaim: locks released
```

## How It Works

1. **Install & init** — One command sets up auth, creates your project, and installs hooks.
2. **Code as usual** — Your AI agent edits files normally. Preclaim intercepts writes and atomically locks each file — invisible until it matters.
3. **Soft signals** — When an agent reads a file, other agents get a heads-up. Advisory only, never blocking.
4. **Collaborate safely** — Multiple agents, one codebase. Conflicts are prevented at the source.

Locks are atomic (via Supabase RPC), fail-open on network errors, and resolve within 2 seconds.

## Quick Start

```bash
npm i -g preclaim    # or: pnpm add -g preclaim
preclaim init
```

That's it. `preclaim init` handles everything:

1. **Authentication** — logs you in via GitHub OAuth (skips if already logged in)
2. **Project setup** — creates a new project or joins an existing one (if `.preclaim.json` is already in the repo)
3. **Agent detection** — automatically detects your AI agent and configures it:
   - **Claude Code** → installs hooks (`.claude/settings.json`)
   - **Cursor** → writes MCP config (`.cursor/mcp.json`)
   - **Windsurf** → writes MCP config (`.windsurf/mcp.json`)
   - **Cline** → writes MCP config (`.cline/mcp.json`)

Every team member runs the same command. First person creates the project, everyone after joins automatically.

## Documentation

Full reference at [preclaim.dev/docs](https://preclaim.dev/docs) — CLI commands, MCP tools, hooks, and configuration. Generated from the same source code that powers the tools.

## CLI Commands

| Command | Description |
|---|---|
| `preclaim init` | Full setup — auth, project, agent detection + config |
| `preclaim login` | Authenticate via GitHub OAuth |
| `preclaim status` | Show active locks and soft signals, with dashboard link |
| `preclaim lock <file>` | Manually lock a file |
| `preclaim unlock [file]` | Release locks (specific file, all, or `--force` to override any session) |
| `preclaim check <files...>` | Check lock status for specific files |
| `preclaim whoami` | Display current user info |
| `preclaim config` | View/modify project configuration |
| `preclaim sessions` | Show active sessions for this project |
| `preclaim logs` | Show recent lock activity for this project |
| `preclaim info` | Show project ID, backend, dashboard URL, config, and version |
| `preclaim open` | Open the Preclaim dashboard in your browser |
| `preclaim doctor` | Health checks: backend, credentials, hooks, heartbeat |
| `preclaim upgrade` | Update Preclaim CLI to the latest version |
| `preclaim install-hooks` | Install Claude Code hooks |

## Integrations

### Claude Code Hooks

Preclaim integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) via hooks:

| Hook | Trigger | Action |
|---|---|---|
| **PreToolUse** | Agent reads a file | Registers a soft signal (60s TTL) |
| **PreToolUse** | Agent writes a file | Claims a lock — blocks if another agent holds it |
| **PostToolUse** | Agent runs `git commit` | Auto-releases all session locks |
| **SessionStart** | New Claude Code session | Registers session, starts heartbeat daemon |

The **heartbeat daemon** runs in the background, extending lock TTLs every 60 seconds so locks don't expire during long sessions.

### MCP Server

The `@preclaim/mcp` package runs as a local subprocess and exposes Preclaim as MCP tools:

| Tool | Description |
|---|---|
| `preclaim_lock` | Lock a file before editing — prevents conflicts |
| `preclaim_unlock` | Release a lock on a file, all session locks, or force-release any lock |
| `preclaim_check` | Check lock status of files without locking |
| `preclaim_status` | List all active locks and sessions |
| `preclaim_read` | Signal you're reading a file (soft signal, 60s TTL) |

The MCP server handles session lifecycle, heartbeats, and credential refresh automatically. No extra infrastructure needed — it runs locally and connects to the same Preclaim backend.

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
  mcp/     # MCP server for any agent                (@preclaim/mcp)
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
Agent writes a file
  → POST /api/v1/locks
    → supabase.rpc('claim_file')
      → FOR UPDATE (atomic, blocking)
        → acquired | already_held | conflict
```

Locks expire via TTL (default: 30 min). A background heartbeat extends TTLs during active sessions. `git commit` auto-releases all locks. Crashed sessions are cleaned up by `pg_cron` every 5 minutes.

### Soft Signals

When an agent reads a file, Preclaim registers a **soft signal** — a short-lived interest marker (60s TTL). If another agent tries to write to that file, they get an advisory warning but are **never blocked**. This gives agents awareness of each other's activity without slowing anyone down.

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
