#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { lockCommand } from './commands/lock.js';
import { unlockCommand } from './commands/unlock.js';
import { statusCommand } from './commands/status.js';
import { checkCommand } from './commands/check.js';
import { whoamiCommand } from './commands/whoami.js';
import { configCommand } from './commands/config.js';
import { installHooksCommand } from './commands/install-hooks.js';

const program = new Command();

program
  .name('preclaim')
  .description('AI File Coordination Layer — predictive file locking for AI coding agents')
  .version('0.2.9');

program
  .command('init')
  .description('Initialize Preclaim in the current project')
  .option('--backend <url>', 'Backend URL', 'https://preclaim.dev')
  .option('--project-id <id>', 'Project ID')
  .action(initCommand);

program
  .command('login')
  .description('Authenticate with Preclaim')
  .action(loginCommand);

program
  .command('lock <file>')
  .description('Lock a file')
  .option('-s, --session <id>', 'Session ID')
  .option('-t, --ttl <minutes>', 'Lock TTL in minutes')
  .action(lockCommand);

program
  .command('unlock [file]')
  .description('Release a file lock')
  .option('-s, --session <id>', 'Session ID')
  .option('-a, --all', 'Release all locks for this session')
  .action(unlockCommand);

program
  .command('status')
  .description('Show active locks for this project')
  .action(statusCommand);

program
  .command('check <files...>')
  .description('Check lock status for files')
  .action(checkCommand);

program
  .command('whoami')
  .description('Show current user info')
  .action(whoamiCommand);

program
  .command('config')
  .description('View or modify project configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .action(configCommand);

program
  .command('install-hooks')
  .description('Install Claude Code hooks in the current project')
  .action(installHooksCommand);

// Internal: hook runner for Claude Code hooks via npx
const hook = program
  .command('hook')
  .description('Run a Claude Code hook (internal)');

hook.command('pre-tool-use').action(async () => {
  await import('./hooks/pre-tool-use.js');
});
hook.command('post-tool-use').action(async () => {
  await import('./hooks/post-tool-use.js');
});
hook.command('session-start').action(async () => {
  await import('./hooks/session-start.js');
});
hook.command('stop').action(async () => {
  await import('./hooks/stop.js');
});

program.parse();
