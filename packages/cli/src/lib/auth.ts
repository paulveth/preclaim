import { loadCredentials, type PreclaimCredentials } from '@preclaim/core';

export async function requireAuth(): Promise<PreclaimCredentials> {
  const creds = await loadCredentials();
  if (!creds) {
    console.error('Not logged in. Run `preclaim login` first.');
    process.exit(1);
  }

  // Check expiry
  if (new Date(creds.expiresAt) < new Date()) {
    console.error('Session expired. Run `preclaim login` to re-authenticate.');
    process.exit(1);
  }

  return creds;
}
