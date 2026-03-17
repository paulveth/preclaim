import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ClaudeSettings {
  hooks?: Record<string, Array<{
    matcher: string;
    hooks: Array<{
      type: string;
      command: string;
    }>;
  }>>;
}

export async function installHooksCommand() {
  const hooksDir = join(__dirname, '..', 'hooks');
  const settingsDir = join(process.cwd(), '.claude');
  const settingsPath = join(settingsDir, 'settings.json');

  // Read existing settings or create new
  let settings: ClaudeSettings = {};
  try {
    const raw = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(raw);
  } catch {
    // File doesn't exist
  }

  settings.hooks = {
    PreToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${join(hooksDir, 'pre-tool-use.js')}`,
      }],
    }],
    PostToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${join(hooksDir, 'post-tool-use.js')}`,
      }],
    }],
    Stop: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${join(hooksDir, 'stop.js')}`,
      }],
    }],
    SessionStart: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${join(hooksDir, 'session-start.js')}`,
      }],
    }],
  };

  await mkdir(settingsDir, { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');

  console.log('Claude Code hooks installed in .claude/settings.json');
  console.log('');
  console.log('Hooks configured:');
  console.log('  - PreToolUse: file lock gatekeeper');
  console.log('  - PostToolUse: commit detection → release locks');
  console.log('  - Stop: session cleanup');
  console.log('  - SessionStart: session registration + heartbeat');
}
