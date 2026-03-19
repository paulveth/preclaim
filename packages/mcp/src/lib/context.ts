import { dirname } from 'node:path';
import {
  PreclaimClient,
  findConfig,
  loadCredentials,
  refreshCredentials,
  type PreclaimConfig,
  type PreclaimCredentials,
} from '@preclaim/core';

export interface PreclaimContext {
  client: PreclaimClient;
  config: PreclaimConfig;
  projectRoot: string;
  credentials: PreclaimCredentials;
}

export async function loadContext(): Promise<PreclaimContext> {
  const found = await findConfig(process.env.PRECLAIM_PROJECT_DIR ?? process.cwd());
  if (!found) {
    throw new Error('No .preclaim.json found. Run `preclaim init` in your project root.');
  }

  let creds = await loadCredentials();
  if (!creds) {
    throw new Error('Not authenticated. Run `preclaim login` first.');
  }

  // Refresh if within 60s of expiry
  const expiresAt = new Date(creds.expiresAt).getTime();
  if (Date.now() >= expiresAt - 60_000) {
    const refreshed = await refreshCredentials();
    if (refreshed) creds = refreshed;
  }

  const client = new PreclaimClient({
    baseUrl: found.config.backend,
    accessToken: creds.accessToken,
    timeoutMs: 5000,
  });

  return {
    client,
    config: found.config,
    projectRoot: dirname(found.configPath),
    credentials: creds,
  };
}
