#!/usr/bin/env node
// PreToolUse hook — the gatekeeper
// Intercepts Edit/Write/MultiEdit tool calls, claims file locks

import { PreclaimClient, findConfig, loadCredentials } from '@preclaim/core';
import { readHookInput, writeHookOutput } from '../lib/hook-io.js';
import { minimatch } from 'minimatch';

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

async function main() {
  try {
    const input = await readHookInput();

    // Only intercept file-writing tools
    if (!input.tool_name || !WRITE_TOOLS.has(input.tool_name)) {
      return; // No output = allow
    }

    // Extract file path from tool input
    const filePath = input.tool_input?.file_path as string | undefined;
    if (!filePath) {
      return; // No file path = allow
    }

    // Load config
    const found = await findConfig();
    if (!found) {
      return; // No config = allow (not a preclaim project)
    }

    // Check ignore patterns
    const relativePath = filePath.startsWith('/') ? filePath : filePath;
    if (found.config.ignore.some(pattern => minimatch(relativePath, pattern))) {
      return; // Ignored file = allow
    }

    // Load credentials
    const creds = await loadCredentials();
    if (!creds) {
      if (found.config.failOpen) return;
      writeHookOutput({
        permissionDecision: 'deny',
        reason: 'Preclaim: not authenticated. Run `preclaim login`.',
      });
      return;
    }

    // Claim file
    const client = new PreclaimClient({
      baseUrl: found.config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 2000, // Must be fast
    });

    const result = await client.claimFile({
      project_id: found.config.projectId,
      file_path: relativePath,
      session_id: input.session_id,
      ttl_minutes: found.config.ttl,
    });

    // Network error — fail open
    if (result.error) {
      if (found.config.failOpen) {
        writeHookOutput({
          permissionDecision: 'allow',
          systemMessage: `[Preclaim] Warning: could not reach server (${result.error}). Proceeding without lock.`,
        });
        return;
      }
      writeHookOutput({
        permissionDecision: 'deny',
        reason: `Preclaim: server error — ${result.error}`,
      });
      return;
    }

    const data = result.data!;

    if (data.status === 'acquired') {
      writeHookOutput({
        permissionDecision: 'allow',
        systemMessage: `[Preclaim] Locked: ${relativePath} (expires: ${data.expires_at})`,
      });
    } else if (data.status === 'already_held') {
      writeHookOutput({
        permissionDecision: 'allow',
        systemMessage: `[Preclaim] Lock extended: ${relativePath} (expires: ${data.expires_at})`,
      });
    } else if (data.status === 'conflict') {
      writeHookOutput({
        permissionDecision: 'deny',
        reason: [
          `Preclaim: ${relativePath} is locked by another session.`,
          `  Session: ${data.holder!.session_id.slice(0, 8)}…`,
          `  Since: ${new Date(data.holder!.acquired_at).toLocaleTimeString()}`,
          `  Expires: ${new Date(data.holder!.expires_at).toLocaleTimeString()}`,
          '',
          'Wait for the lock to expire or work on a different file.',
        ].join('\n'),
      });
    }
  } catch {
    // Fail open — never block development
    return;
  }
}

main();
