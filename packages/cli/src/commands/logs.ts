import { resolveContext } from '../lib/client-factory.js';
import { formatActivityTable } from '../lib/output.js';

export async function logsCommand() {
  const { client, config } = await resolveContext();

  const result = await client.listActivity(config.projectId);

  if (result.error) {
    console.error(`Failed to fetch logs: ${result.error}`);
    process.exit(1);
  }

  const entries = result.data!.slice(0, 20);
  console.log(formatActivityTable(entries));
}
