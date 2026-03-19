# preclaim_

**One file. One agent. Zero conflicts.**

Predictive file locking for AI coding agents. Preclaim prevents merge conflicts when multiple AI agents work on the same codebase — before they happen.

```
Agent A: edit src/auth.ts  →  preclaim: ✓ locked for you
Agent B: edit src/auth.ts  →  preclaim: ✗ conflict — locked by Agent A
Agent A: git commit         →  preclaim: locks released
```

## How It Works

1. **Install & init** — One command sets up auth, creates your project, and installs hooks.
2. **Code as usual** — Your AI agent edits files normally. Preclaim intercepts writes and atomically locks each file — invisible until it matters.
3. **Soft signals** — When an agent reads a file, other agents get a heads-up. Advisory only, never blocking.
4. **Collaborate safely** — Multiple agents, one codebase. Conflicts are prevented at the source.

Locks are atomic (via Supabase RPC), fail-open on network errors, and resolve within 2 seconds.

## Quick Start

### Option 1: Claude Code (direct hooks)

```bash
npm i -g preclaim
preclaim init
```

That's it. `preclaim init` handles authentication (GitHub OAuth), project creation, and hook installation.

### Option 2: MCP Server (any agent)

Works with Cursor, Windsurf, Cline, Claude Desktop, and any MCP-compatible agent.

```bash
# First, authenticate and initialize your project
npm i -g preclaim
preclaim login
preclaim init
```

Then add to your agent's MCP config:

```json
{
  "mcpServers": {
    "preclaim": {
      "command": "npx",
      "args": ["@preclaim/mcp"]
    }
  }
}
```

The MCP server exposes 5 tools: `preclaim_lock`, `preclaim_unlock`, `preclaim_check`, `preclaim_status`, and `preclaim_read`.

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
| `preclaim_unlock` | Release a lock on a file, or all session locks |
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
