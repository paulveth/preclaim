#!/usr/bin/env node
// PreToolUse hook — the gatekeeper
// Intercepts Read for soft signals, Edit/Write/MultiEdit for hard locks

import { resolve, relative, dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { PreclaimClient, findConfig, loadCredentials, refreshCredentials } from '@preclaim/core';
import { readHookInput, writeHookOutput } from '../lib/hook-io.js';
import { minimatch } from 'minimatch';

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);
const READ_TOOLS = new Set(['Read']);

async function main() {
  try {
    const input = await readHookInput();

    // Update activity timestamp on every tool call (not just writes)
    try {
      await writeFile(join(process.cwd(), '.preclaim.activity'), String(Date.now()));
    } catch {
      // Non-critical — don't block on activity tracking
    }

    const isWrite = input.tool_name && WRITE_TOOLS.has(input.tool_name);
    const isRead = input.tool_name && READ_TOOLS.has(input.tool_name);

    if (!isWrite && !isRead) {
      return; // Not a file tool = allow
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

    // Normalize path: always relative to project root
    const projectRoot = dirname(found.configPath);
    const absolutePath = resolve(projectRoot, filePath);
    const relativePath = relative(projectRoot, absolutePath);

    if (found.config.ignore.some(pattern => minimatch(relativePath, pattern))) {
      return; // Ignored file = allow
    }

    // ─── READ TOOL: register interest (soft signal) ───
    if (isRead) {
      let creds = await loadCredentials();
      if (!creds) return; // No creds = skip silently

      const expiresAt = new Date(creds.expiresAt).getTime();
      if (Date.now() >= expiresAt - 60_000) {
        const refreshed = await refreshCredentials();
        if (refreshed) creds = refreshed;
      }

      const client = new PreclaimClient({
        baseUrl: found.config.backend,
        accessToken: creds.accessToken,
        timeoutMs: 200, // 200ms cap — worst case latency for reads
      });

      // Fire and forget with timeout cap — don't block on interest registration
      await client.registerInterest({
        project_id: found.config.projectId,
        file_path: relativePath,
        session_id: input.session_id,
      }).catch(() => {
        // Fail silently — interest registration is best-effort
      });

      return; // No output = allow
    }

    // ─── WRITE TOOL: claim lock + check interests ───

    // Load credentials, refresh if expired
    let creds = await loadCredentials();
    if (!creds) {
      if (found.config.failOpen) return;
      writeHookOutput({
        permissionDecision: 'deny',
        reason: 'Preclaim: not authenticated. Run `preclaim login`.',
      });
      return;
    }

    const expiresAt = new Date(creds.expiresAt).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      const refreshed = await refreshCredentials();
      if (refreshed) creds = refreshed;
    }

    const client = new PreclaimClient({
      baseUrl: found.config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 2000, // Must be fast
    });

    // Claim lock + check interests in parallel — no extra latency
    const [claimResult, interestsResult] = await Promise.all([
      client.claimFile({
        project_id: found.config.projectId,
        file_path: relativePath,
        session_id: input.session_id,
        ttl_minutes: found.config.ttl,
      }),
      client.checkInterests({
        project_id: found.config.projectId,
        file_path: relativePath,
        exclude_session_id: input.session_id,
      }).catch(() => null), // Interest check is best-effort
    ]);

    // Build interest warning if other sessions are reading this file
    let interestWarning = '';
    if (interestsResult?.data?.interests && interestsResult.data.interests.length > 0) {
      const count = interestsResult.data.interests.length;
      interestWarning = `[Preclaim] Heads up: ${count} other session${count > 1 ? 's are' : ' is'} reading this file. Proceed with caution.\n`;
    }

    // Network error — fail open
    if (claimResult.error) {
      if (found.config.failOpen) {
        writeHookOutput({
          permissionDecision: 'allow',
          systemMessage: `${interestWarning}[Preclaim] Warning: could not reach server (${claimResult.error}). Proceeding without lock.`,
        });
        return;
      }
      writeHookOutput({
        permissionDecision: 'deny',
        reason: `Preclaim: server error — ${claimResult.error}`,
      });
      return;
    }

    const data = claimResult.data!;

    if (data.status === 'acquired') {
      writeHookOutput({
        permissionDecision: 'allow',
        systemMessage: `${interestWarning}[Preclaim] Locked: ${relativePath} (expires: ${data.expires_at})`,
      });
    } else if (data.status === 'already_held') {
      writeHookOutput({
        permissionDecision: 'allow',
        systemMessage: `${interestWarning}[Preclaim] Lock extended: ${relativePath} (expires: ${data.expires_at})`,
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
          `To force-release: preclaim unlock ${relativePath} --force`,
        ].join('\n'),
      });
    }
  } catch {
    // Fail open — never block development
    return;
  }
}

main();
