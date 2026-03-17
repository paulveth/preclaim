import { PreclaimClient, findConfig, type PreclaimConfig, type PreclaimCredentials } from '@preclaim/core';
import { requireAuth } from './auth.js';

export interface ResolvedContext {
  client: PreclaimClient;
  config: PreclaimConfig;
  credentials: PreclaimCredentials;
}

export async function resolveContext(): Promise<ResolvedContext> {
  const credentials = await requireAuth();

  const found = await findConfig();
  if (!found) {
    console.error('No .preclaim.json found. Run `preclaim init` in your project root.');
    process.exit(1);
  }

  const client = new PreclaimClient({
    baseUrl: found.config.backend,
    accessToken: credentials.accessToken,
    timeoutMs: 5000,
  });

  return { client, config: found.config, credentials };
}
