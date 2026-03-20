import { createRequire } from 'node:module';
import { findConfig, loadCredentials, PreclaimClient } from '@preclaim/core';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export async function infoCommand() {
  const found = await findConfig();
  if (!found) {
    console.error('No .preclaim.json found. Run `preclaim init` first.');
    process.exit(1);
  }

  const { config } = found;
  const dashboardUrl = `${config.backend}/projects/${config.projectId}`;

  console.log(`Preclaim CLI v${version}`);
  console.log('');
  console.log(`Project:    ${config.projectId}`);
  console.log(`Backend:    ${config.backend}`);
  console.log(`Dashboard:  ${dashboardUrl}`);
  console.log('');
  console.log(`TTL:        ${config.ttl}m`);
  console.log(`Fail-open:  ${config.failOpen}`);
  console.log(`Ignore:     ${config.ignore.length > 0 ? config.ignore.join(', ') : 'none'}`);
  if (config.idleTimeoutMinutes) {
    console.log(`Idle timeout: ${config.idleTimeoutMinutes}m`);
  }

  const creds = await loadCredentials();
  if (creds) {
    console.log('');
    console.log(`User:       ${creds.user.email}`);

    const client = new PreclaimClient({
      baseUrl: config.backend,
      accessToken: creds.accessToken,
      timeoutMs: 3000,
    });

    const ping = await client.ping();
    console.log(`Backend:    ${ping.ok ? `reachable (${ping.latencyMs}ms)` : `unreachable — ${ping.error}`}`);
  } else {
    console.log('');
    console.log('Not logged in. Run `preclaim login` to authenticate.');
  }
}
