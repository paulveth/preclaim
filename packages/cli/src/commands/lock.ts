import { resolveContext } from '../lib/client-factory.js';

export async function lockCommand(filePath: string, opts: { session?: string; ttl?: string }) {
  const { client, config } = await resolveContext();
  const sessionId = opts.session ?? `manual_${crypto.randomUUID().slice(0, 8)}`;
  const ttl = opts.ttl ? parseInt(opts.ttl, 10) : config.ttl;

  const result = await client.claimFile({
    project_id: config.projectId,
    file_path: filePath,
    session_id: sessionId,
    ttl_minutes: ttl,
  });

  if (result.error) {
    console.error(`Failed to lock: ${result.error}`);
    process.exit(1);
  }

  const data = result.data!;

  if (data.status === 'acquired' || data.status === 'already_held') {
    console.log(`Locked: ${filePath} (expires: ${new Date(data.expires_at!).toLocaleTimeString()})`);
  } else if (data.status === 'conflict') {
    console.error(`Conflict: ${filePath} is locked by session ${data.holder!.session_id.slice(0, 8)}…`);
    console.error(`  Acquired: ${new Date(data.holder!.acquired_at).toLocaleTimeString()}`);
    console.error(`  Expires:  ${new Date(data.holder!.expires_at).toLocaleTimeString()}`);
    process.exit(1);
  }
}
