#!/usr/bin/env node
// PostToolUse hook — commit detection
// Detects git commit commands and releases all session locks

import { PreclaimClient, findConfig, loadCredentials } from '@preclaim/core';
import { readHookInput } from '../lib/hook-io.js';

async function main() {
  try {
    const input = await readHookInput();

    // Only match Bash tool calls
    if (input.tool_name !== 'Bash') return;

    const command = input.tool_input?.command as string | undefined;
    if (!command) return;

    // Detect git commit (not amend, not just `git commit --help`)
    const isCommit = /\bgit\s+commit\b/.test(command) && !/--help/.test(command);
    if (!isCommit) return;

    const found = await findConfig();
    if (!found) return;

    const creds = await loadCredentials();
    if (!creds) return;

    const client = new PreclaimClient({
      baseUrl: found.config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 3000,
    });

    // Release all locks for this session
    await client.releaseLocks({
      project_id: found.config.projectId,
      session_id: input.session_id,
    });
  } catch {
    // Silent fail — non-critical
  }
}

main();
