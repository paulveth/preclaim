#!/usr/bin/env node
// SessionStart hook — init
// Registers session, starts heartbeat daemon, injects system message

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PreclaimClient, findConfig, loadCredentials, refreshCredentials } from '@preclaim/core';
import { readHookInput, writeHookOutput } from '../lib/hook-io.js';
import { checkForUpdate } from '../lib/version-check.js';

async function main() {
  try {
    const input = await readHookInput();

    const found = await findConfig();
    if (!found) return;

    let creds = await loadCredentials();
    if (!creds) {
      writeHookOutput({
        systemMessage: '[Preclaim] Not authenticated. File locking disabled. Run `preclaim login` to enable.',
      });
      return;
    }

    // Refresh token if within 60s of expiry
    const expiresAt = new Date(creds.expiresAt).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      const refreshed = await refreshCredentials();
      if (refreshed) {
        creds = refreshed;
      }
    }

    const client = new PreclaimClient({
      baseUrl: found.config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 3000,
    });

    // Register session + version check in parallel
    const [result, updateNotice] = await Promise.all([
      client.registerSession({
        session_id: input.session_id,
        project_id: found.config.projectId,
        provider: 'claude-code',
      }),
      checkForUpdate(),
    ]);

    if (result.error) {
      if (found.config.failOpen) {
        writeHookOutput({
          systemMessage: `[Preclaim] Warning: could not register session (${result.error}). File locking may not work.`,
        });
        return;
      }
      writeHookOutput({
        systemMessage: `[Preclaim] Error: could not register session (${result.error}). File locking disabled.`,
      });
      return;
    }

    // Write initial activity timestamp
    const activityFile = join(process.cwd(), '.preclaim.activity');
    await writeFile(activityFile, String(Date.now()));

    // Start heartbeat daemon
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const heartbeatScript = join(__dirname, 'heartbeat-daemon.js');

    const daemon = spawn('node', [heartbeatScript], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PRECLAIM_SESSION_ID: input.session_id,
        PRECLAIM_BACKEND: found.config.backend,
        PRECLAIM_ACCESS_TOKEN: creds.accessToken,
        PRECLAIM_IDLE_TIMEOUT: String(found.config.idleTimeoutMinutes ?? 15),
      },
    });

    daemon.unref();

    // Save PID for cleanup
    if (daemon.pid) {
      await writeFile(join(process.cwd(), '.preclaim.pid'), String(daemon.pid));
    }

    const lines = [
      '[Preclaim] Session registered. File locking is active.',
      '',
      'Preclaim coordinates file access across multiple AI sessions:',
      '- Files are automatically locked when you edit them',
      '- Locks prevent other sessions from editing the same files',
      '- Locks are released when you commit or this session ends',
      '- If a lock is denied, work on a different file',
    ];

    if (updateNotice) {
      lines.push('', `⚠ ${updateNotice}`);
    }

    writeHookOutput({ systemMessage: lines.join('\n') });
  } catch {
    // Fail open
  }
}

main();
