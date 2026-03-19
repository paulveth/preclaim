import { resolve, relative } from 'node:path';
import type { SessionManager } from '../session.js';
import { withFailOpen } from '../lib/fail-open.js';

export async function handleCheck(
  session: SessionManager,
  args: { file_paths: string[] },
) {
  const ctx = await session.ensureInitialized();

  // Normalize paths
  const normalizedPaths = args.file_paths.map(fp => {
    const abs = resolve(ctx.projectRoot, fp);
    return relative(ctx.projectRoot, abs);
  });

  const result = await withFailOpen(
    ctx.config,
    () => ctx.client.batchCheck({
      project_id: ctx.config.projectId,
      file_paths: normalizedPaths,
    }),
    'Could not reach server',
  );

  if (result.warning) {
    return { content: [{ type: 'text' as const, text: result.warning }] };
  }

  if (result.error) {
    return { content: [{ type: 'text' as const, text: result.error }], isError: true };
  }

  const locks = result.data!.locks;
  const lines: string[] = [];

  for (const filePath of normalizedPaths) {
    const lock = locks[filePath];
    if (lock) {
      lines.push(`🔒 ${filePath} — locked by session ${lock.session_id.slice(0, 8)}… (expires: ${new Date(lock.expires_at).toLocaleTimeString()})`);
    } else {
      lines.push(`✓ ${filePath} — available`);
    }
  }

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}
