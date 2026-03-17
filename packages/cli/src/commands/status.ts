import { resolveContext } from '../lib/client-factory.js';
import { formatLockTable } from '../lib/output.js';

export async function statusCommand() {
  const { client, config } = await resolveContext();

  const result = await client.listLocks(config.projectId);

  if (result.error) {
    console.error(`Failed to fetch status: ${result.error}`);
    process.exit(1);
  }

  console.log(formatLockTable(result.data!));
}
