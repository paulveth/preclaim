import { resolveContext } from '../lib/client-factory.js';

export async function unlockCommand(filePath: string | undefined, opts: { session?: string; all?: boolean; force?: boolean }) {
  const { client, config } = await resolveContext();

  if (!filePath && !opts.all) {
    console.error('Specify a file path or use --all to release all locks.');
    process.exit(1);
  }

  if (opts.force) {
    const result = await client.forceReleaseLocks({
      project_id: config.projectId,
      file_path: filePath,
    });

    if (result.error) {
      console.error(`Failed to force-unlock: ${result.error}`);
      process.exit(1);
    }

    console.log(`Force-released ${result.data!.released} lock(s).`);
    return;
  }

  const sessionId = opts.session ?? `manual_${crypto.randomUUID().slice(0, 8)}`;

  const result = await client.releaseLocks({
    project_id: config.projectId,
    file_path: filePath,
    session_id: sessionId,
  });

  if (result.error) {
    console.error(`Failed to unlock: ${result.error}`);
    process.exit(1);
  }

  console.log(`Released ${result.data!.released} lock(s).`);
}
