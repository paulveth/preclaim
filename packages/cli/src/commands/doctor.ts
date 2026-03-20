import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { findConfig, loadCredentials, PreclaimClient } from '@preclaim/core';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

const PASS = '\x1b[32m✓\x1b[0m';
const WARN = '\x1b[33m!\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

function icon(status: Check['status']): string {
  if (status === 'ok') return PASS;
  if (status === 'warn') return WARN;
  return FAIL;
}

export async function doctorCommand() {
  const checks: Check[] = [];

  // 1. Config file
  const found = await findConfig();
  if (found) {
    checks.push({ name: 'Config', status: 'ok', message: `.preclaim.json found` });
  } else {
    checks.push({ name: 'Config', status: 'fail', message: 'No .preclaim.json — run `preclaim init`' });
    printResults(checks);
    return;
  }

  const { config } = found;

  // 2. Credentials
  const creds = await loadCredentials();
  if (creds) {
    const expiresAt = new Date(creds.expiresAt).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      checks.push({ name: 'Credentials', status: 'warn', message: 'Token expired — run `preclaim login`' });
    } else {
      checks.push({ name: 'Credentials', status: 'ok', message: creds.user.email });
    }
  } else {
    checks.push({ name: 'Credentials', status: 'fail', message: 'Not logged in — run `preclaim login`' });
  }

  // 3. Backend reachability
  if (creds) {
    const client = new PreclaimClient({
      baseUrl: config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 5000,
    });

    const ping = await client.ping();
    if (ping.ok) {
      checks.push({ name: 'Backend', status: 'ok', message: `${config.backend} (${ping.latencyMs}ms)` });
    } else {
      checks.push({ name: 'Backend', status: 'fail', message: `Unreachable — ${ping.error}` });
    }
  } else {
    checks.push({ name: 'Backend', status: 'warn', message: 'Skipped (no credentials)' });
  }

  // 4. Hooks installed
  const hooksPath = join(process.cwd(), '.claude', 'settings.json');
  try {
    const raw = await readFile(hooksPath, 'utf-8');
    const settings = JSON.parse(raw) as { hooks?: Record<string, unknown> };
    if (settings.hooks && Object.keys(settings.hooks).length > 0) {
      checks.push({ name: 'Hooks', status: 'ok', message: 'Claude Code hooks installed' });
    } else {
      checks.push({ name: 'Hooks', status: 'warn', message: 'No hooks found — run `preclaim install-hooks`' });
    }
  } catch {
    checks.push({ name: 'Hooks', status: 'warn', message: 'No .claude/settings.json — run `preclaim install-hooks`' });
  }

  // 5. Heartbeat daemon
  const pidPath = join(process.cwd(), '.preclaim.pid');
  try {
    const pidStr = await readFile(pidPath, 'utf-8');
    const pid = parseInt(pidStr.trim(), 10);
    try {
      process.kill(pid, 0); // Check if process exists
      checks.push({ name: 'Heartbeat', status: 'ok', message: `Daemon running (PID ${pid})` });
    } catch {
      checks.push({ name: 'Heartbeat', status: 'warn', message: 'Daemon not running (stale PID file)' });
    }
  } catch {
    // Check activity file to see if there's been recent activity
    const activityPath = join(process.cwd(), '.preclaim.activity');
    try {
      const activityStat = await stat(activityPath);
      const ageMs = Date.now() - activityStat.mtimeMs;
      if (ageMs < 120_000) {
        checks.push({ name: 'Heartbeat', status: 'warn', message: 'No PID file but recent activity detected' });
      } else {
        checks.push({ name: 'Heartbeat', status: 'ok', message: 'No active session (daemon starts with agent session)' });
      }
    } catch {
      checks.push({ name: 'Heartbeat', status: 'ok', message: 'No active session (daemon starts with agent session)' });
    }
  }

  printResults(checks);
}

function printResults(checks: Check[]) {
  console.log('Preclaim Doctor\n');

  for (const check of checks) {
    console.log(`  ${icon(check.status)} ${check.name.padEnd(14)} ${check.message}`);
  }

  const failures = checks.filter(c => c.status === 'fail');
  const warnings = checks.filter(c => c.status === 'warn');

  console.log('');
  if (failures.length > 0) {
    console.log(`${failures.length} issue(s) found. Fix the items marked with ${FAIL} above.`);
  } else if (warnings.length > 0) {
    console.log(`All good, ${warnings.length} warning(s).`);
  } else {
    console.log('Everything looks healthy!');
  }
}
