import { resolveContext } from '../lib/client-factory.js';

export async function checkCommand(filePaths: string[]) {
  if (filePaths.length === 0) {
    console.error('Specify one or more file paths to check.');
    process.exit(1);
  }

  const { client, config } = await resolveContext();

  const result = await client.batchCheck({
    project_id: config.projectId,
    file_paths: filePaths,
  });

  if (result.error) {
    console.error(`Failed to check: ${result.error}`);
    process.exit(1);
  }

  for (const [path, lock] of Object.entries(result.data!.locks)) {
    if (lock) {
      console.log(`LOCKED  ${path}  (session: ${lock.session_id.slice(0, 8)}…  expires: ${new Date(lock.expires_at).toLocaleTimeString()})`);
    } else {
      console.log(`FREE    ${path}`);
    }
  }
}
