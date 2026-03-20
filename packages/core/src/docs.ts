// ─── Docs: single source of truth for CLI, MCP, and web docs ───

// ─── Types ───

export interface DocCommandOption {
  flags: string;
  description: string;
  default?: string;
}

export interface DocCommand {
  name: string;
  usage: string;
  description: string;
  options?: DocCommandOption[];
  example?: string;
}

export interface DocToolArg {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface DocTool {
  name: string;
  description: string;
  args: DocToolArg[];
}

export interface DocHook {
  name: string;
  event: string;
  description: string;
}

export interface DocConfigEntry {
  key: string;
  description: string;
  default?: string;
}

// ─── CLI Commands ───

export const cliCommands: DocCommand[] = [
  {
    name: 'init',
    usage: 'preclaim init',
    description: 'Full setup — auth, project creation/join, and automatic agent detection + configuration',
    options: [
      { flags: '--backend <url>', description: 'Backend URL', default: 'https://preclaim.dev' },
      { flags: '--project-id <id>', description: 'Project ID (skip onboarding)' },
    ],
    example: 'preclaim init',
  },
  {
    name: 'login',
    usage: 'preclaim login',
    description: 'Authenticate with Preclaim',
    example: 'preclaim login',
  },
  {
    name: 'lock',
    usage: 'preclaim lock <file>',
    description: 'Lock a file',
    options: [
      { flags: '-s, --session <id>', description: 'Session ID' },
      { flags: '-t, --ttl <minutes>', description: 'Lock TTL in minutes' },
    ],
    example: 'preclaim lock src/api/auth.ts --ttl 30',
  },
  {
    name: 'unlock',
    usage: 'preclaim unlock [file]',
    description: 'Release a file lock',
    options: [
      { flags: '-s, --session <id>', description: 'Session ID' },
      { flags: '-a, --all', description: 'Release all locks for this session' },
    ],
    example: 'preclaim unlock src/api/auth.ts',
  },
  {
    name: 'status',
    usage: 'preclaim status',
    description: 'Show active locks for this project',
    example: 'preclaim status',
  },
  {
    name: 'check',
    usage: 'preclaim check <files...>',
    description: 'Check lock status for files',
    example: 'preclaim check src/api/auth.ts src/lib/db.ts',
  },
  {
    name: 'whoami',
    usage: 'preclaim whoami',
    description: 'Show current user info',
    example: 'preclaim whoami',
  },
  {
    name: 'config',
    usage: 'preclaim config',
    description: 'View or modify project configuration',
    options: [
      { flags: '--get <key>', description: 'Get a config value' },
      { flags: '--set <key=value>', description: 'Set a config value' },
    ],
    example: 'preclaim config --set ttl=30',
  },
  {
    name: 'sessions',
    usage: 'preclaim sessions',
    description: 'Show active sessions for this project',
    example: 'preclaim sessions',
  },
  {
    name: 'logs',
    usage: 'preclaim logs',
    description: 'Show recent lock activity for this project',
    example: 'preclaim logs',
  },
  {
    name: 'install-hooks',
    usage: 'preclaim install-hooks',
    description: 'Install Claude Code hooks in the current project',
    example: 'preclaim install-hooks',
  },
  {
    name: 'open',
    usage: 'preclaim open',
    description: 'Open the Preclaim dashboard in your browser',
    example: 'preclaim open',
  },
  {
    name: 'info',
    usage: 'preclaim info',
    description: 'Show project ID, backend URL, dashboard URL, config, and version',
    example: 'preclaim info',
  },
  {
    name: 'doctor',
    usage: 'preclaim doctor',
    description: 'Run health checks: backend, credentials, hooks, heartbeat daemon',
    example: 'preclaim doctor',
  },
  {
    name: 'upgrade',
    usage: 'preclaim upgrade',
    description: 'Update Preclaim CLI to the latest version',
    example: 'preclaim upgrade',
  },
];

// ─── MCP Tools ───

export const mcpTools: DocTool[] = [
  {
    name: 'preclaim_lock',
    description: 'Lock a file before editing it. Call this BEFORE writing to any file to prevent conflicts with other AI sessions. Returns whether the lock was acquired or if another session holds it.',
    args: [
      { name: 'file_path', type: 'string', required: true, description: 'Path to the file to lock (relative or absolute)' },
      { name: 'ttl_minutes', type: 'number', required: false, description: 'Lock duration in minutes (default: from project config)' },
    ],
  },
  {
    name: 'preclaim_unlock',
    description: 'Release a lock on a file, or all locks for this session. Call this after committing changes.',
    args: [
      { name: 'file_path', type: 'string', required: false, description: 'Specific file to unlock. Omit to release all locks.' },
    ],
  },
  {
    name: 'preclaim_check',
    description: 'Check lock status of one or more files without acquiring locks. Use this to see if files are available before editing.',
    args: [
      { name: 'file_paths', type: 'string[]', required: true, description: 'Files to check (1-100 paths)' },
    ],
  },
  {
    name: 'preclaim_status',
    description: 'List all active locks and sessions for this project. Shows who is working on what.',
    args: [],
  },
  {
    name: 'preclaim_read',
    description: 'Signal that you are reading a file. This lets other sessions know you are looking at this file (soft signal, 60s TTL). Call this when reading files to improve coordination.',
    args: [
      { name: 'file_path', type: 'string', required: true, description: 'Path to the file being read' },
    ],
  },
];

// ─── Hooks ───

export const hooks: DocHook[] = [
  {
    name: 'PreToolUse',
    event: 'Before every tool call',
    description: 'The gatekeeper. Intercepts Edit/Write/MultiEdit to acquire file locks before changes, and Read to register soft signals. Allows the tool to proceed if the lock is acquired, blocks with a warning if another session holds the lock.',
  },
  {
    name: 'PostToolUse',
    event: 'After every tool call',
    description: 'Commit detector. Watches for git commit commands and automatically releases all session locks when a commit is detected.',
  },
  {
    name: 'SessionStart',
    event: 'When a Claude Code session starts',
    description: 'Registers the session with Preclaim, starts the heartbeat daemon for automatic lock expiry, and injects a system message with current lock status.',
  },
  {
    name: 'Stop',
    event: 'When a Claude Code session ends',
    description: 'No-op by design. Cleanup is handled by the activity-aware heartbeat daemon (locks expire when idle), server-side pg_cron cleanup, and daemon self-exit after inactivity.',
  },
];

// ─── Configuration ───

export const configEntries: DocConfigEntry[] = [
  {
    key: 'backend',
    description: 'URL of the Preclaim backend API',
    default: 'https://preclaim.dev',
  },
  {
    key: 'projectId',
    description: 'Your Preclaim project ID (set during init)',
  },
  {
    key: 'ttl',
    description: 'Default lock TTL in minutes',
    default: '30',
  },
  {
    key: 'failOpen',
    description: 'Allow tool use when Preclaim is unreachable',
    default: 'true',
  },
  {
    key: 'ignore',
    description: 'Glob patterns for files to never lock (e.g. *.md, dist/**)',
    default: '[]',
  },
  {
    key: 'idleTimeoutMinutes',
    description: 'Minutes of inactivity before the heartbeat daemon releases locks',
  },
];

// ─── Helpers for consumers (CLI, MCP) ───

export function getCommandDescription(name: string): string {
  const cmd = cliCommands.find(c => c.name === name);
  if (!cmd) throw new Error(`Unknown command: ${name}`);
  return cmd.description;
}

export function getToolDescription(name: string): string {
  const tool = mcpTools.find(t => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.description;
}
