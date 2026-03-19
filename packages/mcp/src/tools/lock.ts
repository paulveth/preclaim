import { resolve, relative } from 'node:path';
import { minimatch } from 'minimatch';
import type { SessionManager } from '../session.js';
import { withFailOpen } from '../lib/fail-open.js';

export async function handleLock(
  session: SessionManager,
  args: { file_path: string; ttl_minutes?: number },
) {
  const ctx = await session.ensureInitialized();

  // Normalize path relative to project root
  const absolutePath = resolve(ctx.projectRoot, args.file_path);
  const relativePath = relative(ctx.projectRoot, absolutePath);

  // Check ignore patterns
  if (ctx.config.ignore.some(pattern => minimatch(relativePath, pattern))) {
    return { content: [{ type: 'text' as const, text: `Skipped: ${relativePath} matches ignore pattern.` }] };
  }

  // Claim lock + check interests in parallel
  const [claimResult, interestsResult] = await Promise.all([
    withFailOpen(
      ctx.config,
      () => ctx.client.claimFile({
        project_id: ctx.config.projectId,
        file_path: relativePath,
        session_id: ctx.sessionId,
        ttl_minutes: args.ttl_minutes ?? ctx.config.ttl,
      }),
      'Could not reach server, proceeding without lock',
    ),
    ctx.client.checkInterests({
      project_id: ctx.config.projectId,
      file_path: relativePath,
      exclude_session_id: ctx.sessionId,
    }).catch(() => null),
  ]);

  // Build interest warning
  let interestWarning = '';
  if (interestsResult?.data?.interests && interestsResult.data.interests.length > 0) {
    const count = interestsResult.data.interests.length;
    interestWarning = `⚠ ${count} other session${count > 1 ? 's are' : ' is'} currently reading this file.\n`;
  }

  // Handle fail-open warnings
  if (claimResult.warning) {
    return {
      content: [{ type: 'text' as const, text: `${interestWarning}${claimResult.warning}` }],
    };
  }

  // Handle errors (failOpen: false)
  if (claimResult.error) {
    return {
      content: [{ type: 'text' as const, text: claimResult.error }],
      isError: true,
    };
  }

  const data = claimResult.data!;

  if (data.status === 'acquired') {
    return {
      content: [{ type: 'text' as const, text: `${interestWarning}Locked: ${relativePath} (expires: ${data.expires_at})` }],
    };
  }

  if (data.status === 'already_held') {
    return {
      content: [{ type: 'text' as const, text: `${interestWarning}Lock extended: ${relativePath} (expires: ${data.expires_at})` }],
    };
  }

  // Conflict
  const holder = data.holder!;
  return {
    content: [{
      type: 'text' as const,
      text: [
        `CONFLICT: ${relativePath} is locked by another session.`,
        `  Session: ${holder.session_id.slice(0, 8)}…`,
        `  Since: ${new Date(holder.acquired_at).toLocaleTimeString()}`,
        `  Expires: ${new Date(holder.expires_at).toLocaleTimeString()}`,
        '',
        'Wait for the lock to expire or work on a different file.',
      ].join('\n'),
    }],
    isError: true,
  };
}
