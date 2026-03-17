import { loadCredentials, refreshCredentials, type PreclaimCredentials } from '@preclaim/core';

export async function requireAuth(): Promise<PreclaimCredentials> {
  const creds = await loadCredentials();
  if (!creds) {
    console.error('Not logged in. Run `preclaim login` first.');
    process.exit(1);
  }

  // 60s marge voor clock skew
  const expiresAt = new Date(creds.expiresAt).getTime();
  if (Date.now() >= expiresAt - 60_000) {
    const refreshed = await refreshCredentials();
    if (!refreshed) {
      console.error('Session expired. Run `preclaim login` to re-authenticate.');
      process.exit(1);
    }
    return refreshed;
  }

  return creds;
}
