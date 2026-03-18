import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

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

  // Use npx to resolve the globally/locally installed preclaim binary
  // This works regardless of where preclaim is installed
  settings.hooks = {
    PreToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'preclaim hook pre-tool-use',
      }],
    }],
    PostToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'preclaim hook post-tool-use',
      }],
    }],
    SessionStart: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'preclaim hook session-start',
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
  console.log('  - SessionStart: session registration + heartbeat');
}
