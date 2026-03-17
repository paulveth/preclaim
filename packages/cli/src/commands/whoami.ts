import { loadCredentials } from '@preclaim/core';

export async function whoamiCommand() {
  const creds = await loadCredentials();

  if (!creds) {
    console.log('Not logged in. Run `preclaim login` to authenticate.');
    return;
  }

  console.log(`Email:  ${creds.user.email}`);
  console.log(`User:   ${creds.user.id}`);
  console.log(`Org:    ${creds.user.orgId ?? 'none'}`);
  console.log(`Expires: ${new Date(creds.expiresAt).toLocaleString()}`);
}
