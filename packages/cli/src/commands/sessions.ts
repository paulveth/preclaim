import { resolveContext } from '../lib/client-factory.js';
import { formatSessionTable } from '../lib/output.js';

export async function sessionsCommand() {
  const { client, config } = await resolveContext();

  const result = await client.listSessions(config.projectId);

  if (result.error) {
    console.error(`Failed to fetch sessions: ${result.error}`);
    process.exit(1);
  }

  console.log(formatSessionTable(result.data!));
}
