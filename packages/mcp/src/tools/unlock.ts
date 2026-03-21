import { resolve, relative } from 'node:path';
import type { SessionManager } from '../session.js';
import { withFailOpen } from '../lib/fail-open.js';

export async function handleUnlock(
  session: SessionManager,
  args: { file_path?: string; force?: boolean },
) {
  const ctx = await session.ensureInitialized();

  let filePath: string | undefined;
  if (args.file_path) {
    const absolutePath = resolve(ctx.projectRoot, args.file_path);
    filePath = relative(ctx.projectRoot, absolutePath);
  }

  const result = await withFailOpen(
    ctx.config,
    () => args.force
      ? ctx.client.forceReleaseLocks({
          project_id: ctx.config.projectId,
          file_path: filePath,
        })
      : ctx.client.releaseLocks({
          project_id: ctx.config.projectId,
          session_id: ctx.sessionId,
          file_path: filePath,
        }),
    'Could not reach server',
  );

  if (result.warning) {
    return { content: [{ type: 'text' as const, text: result.warning }] };
  }

  if (result.error) {
    return { content: [{ type: 'text' as const, text: result.error }], isError: true };
  }

  const released = result.data!.released;
  const target = filePath ?? 'all files';
  const prefix = args.force ? 'Force-released' : 'Released';
  return {
    content: [{ type: 'text' as const, text: `${prefix} ${released} lock${released !== 1 ? 's' : ''} (${target}).` }],
  };
}
