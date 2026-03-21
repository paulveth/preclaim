#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { getCommandDescription } from '@preclaim/core';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { lockCommand } from './commands/lock.js';
import { unlockCommand } from './commands/unlock.js';
import { statusCommand } from './commands/status.js';
import { checkCommand } from './commands/check.js';
import { whoamiCommand } from './commands/whoami.js';
import { configCommand } from './commands/config.js';
import { installHooksCommand } from './commands/install-hooks.js';
import { logsCommand } from './commands/logs.js';
import { sessionsCommand } from './commands/sessions.js';
import { openCommand } from './commands/open.js';
import { infoCommand } from './commands/info.js';
import { doctorCommand } from './commands/doctor.js';
import { upgradeCommand } from './commands/upgrade.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const desc = getCommandDescription;

const program = new Command();

program
  .name('preclaim')
  .description('AI File Coordination Layer — predictive file locking for AI coding agents')
  .version(version);

program
  .command('init')
  .description(desc('init'))
  .option('--backend <url>', 'Backend URL', 'https://preclaim.dev')
  .option('--project-id <id>', 'Project ID')
  .action(initCommand);

program
  .command('login')
  .description(desc('login'))
  .action(loginCommand);

program
  .command('lock <file>')
  .description(desc('lock'))
  .option('-s, --session <id>', 'Session ID')
  .option('-t, --ttl <minutes>', 'Lock TTL in minutes')
  .action(lockCommand);

program
  .command('unlock [file]')
  .description(desc('unlock'))
  .option('-s, --session <id>', 'Session ID')
  .option('-a, --all', 'Release all locks for this session')
  .option('-f, --force', 'Force-release locks held by any session')
  .action(unlockCommand);

program
  .command('status')
  .description(desc('status'))
  .action(statusCommand);

program
  .command('check <files...>')
  .description(desc('check'))
  .action(checkCommand);

program
  .command('whoami')
  .description(desc('whoami'))
  .action(whoamiCommand);

program
  .command('config')
  .description(desc('config'))
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .action(configCommand);

program
  .command('sessions')
  .description(desc('sessions'))
  .action(sessionsCommand);

program
  .command('logs')
  .description(desc('logs'))
  .action(logsCommand);

program
  .command('install-hooks')
  .description(desc('install-hooks'))
  .action(installHooksCommand);

program
  .command('open')
  .description(desc('open'))
  .action(openCommand);

program
  .command('info')
  .description(desc('info'))
  .action(infoCommand);

program
  .command('doctor')
  .description(desc('doctor'))
  .action(doctorCommand);

program
  .command('upgrade')
  .description(desc('upgrade'))
  .action(upgradeCommand);

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
