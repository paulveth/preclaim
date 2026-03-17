#!/usr/bin/env node
// Stop hook — cleanup
// Releases all locks and stops heartbeat daemon

import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PreclaimClient, findConfig, loadCredentials } from '@preclaim/core';
import { readHookInput } from '../lib/hook-io.js';

async function main() {
  try {
    const input = await readHookInput();

    const found = await findConfig();
    if (!found) return;

    const creds = await loadCredentials();
    if (!creds) return;

    const client = new PreclaimClient({
      baseUrl: found.config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 3000,
    });

    // End session (releases all locks)
    await client.endSession(input.session_id);

    // Kill heartbeat daemon if running
    const pidFile = join(process.cwd(), '.preclaim.pid');
    try {
      const pid = parseInt(await readFile(pidFile, 'utf-8'), 10);
      process.kill(pid, 'SIGTERM');
      await unlink(pidFile);
    } catch {
      // No daemon running or already stopped
    }
  } catch {
    // Silent fail — cleanup is best-effort
  }
}

main();
