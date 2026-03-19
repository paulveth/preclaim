import { resolve, relative } from 'node:path';
import { minimatch } from 'minimatch';
import { PreclaimClient } from '@preclaim/core';
import type { SessionManager } from '../session.js';

export async function handleRead(
  session: SessionManager,
  args: { file_path: string },
) {
  const ctx = await session.ensureInitialized();

  // Normalize path relative to project root
  const absolutePath = resolve(ctx.projectRoot, args.file_path);
  const relativePath = relative(ctx.projectRoot, absolutePath);

  // Check ignore patterns
  if (ctx.config.ignore.some(pattern => minimatch(relativePath, pattern))) {
    return { content: [{ type: 'text' as const, text: `Skipped: ${relativePath} matches ignore pattern.` }] };
  }

  // Register interest with short timeout — best-effort, never block
  const fastClient = new PreclaimClient({
    baseUrl: ctx.config.backend,
    accessToken: ctx.credentials.accessToken,
    timeoutMs: 200,
  });

  try {
    await fastClient.registerInterest({
      project_id: ctx.config.projectId,
      file_path: relativePath,
      session_id: ctx.sessionId,
    });
  } catch {
    // Fail silently — interest registration is best-effort
  }

  return {
    content: [{ type: 'text' as const, text: `Reading: ${relativePath} (interest registered, 60s TTL)` }],
  };
}
