import { resolveContext } from '../lib/client-factory.js';
import { formatLockTable, formatInterestTable } from '../lib/output.js';

export async function statusCommand() {
  const { client, config } = await resolveContext();

  const [locksResult, interestsResult] = await Promise.all([
    client.listLocks(config.projectId),
    client.listInterests(config.projectId),
  ]);

  if (locksResult.error) {
    console.error(`Failed to fetch locks: ${locksResult.error}`);
    process.exit(1);
  }

  console.log(formatLockTable(locksResult.data!));

  if (!interestsResult.error && interestsResult.data && interestsResult.data.length > 0) {
    console.log('');
    console.log(formatInterestTable(interestsResult.data));
  }

  const dashboardUrl = `${config.backend}/projects/${config.projectId}`;
  console.log(`\nDashboard: ${dashboardUrl}`);
}
