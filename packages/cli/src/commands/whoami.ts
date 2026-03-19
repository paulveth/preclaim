import { PreclaimClient, loadCredentials, findConfig } from '@preclaim/core';

export async function whoamiCommand() {
  const creds = await loadCredentials();

  if (!creds) {
    console.log('Not logged in. Run `preclaim login` to authenticate.');
    process.exit(1);
  }

  const found = await findConfig();
  const baseUrl = found?.config.backend ?? 'https://preclaim.dev';

  const client = new PreclaimClient({
    baseUrl,
    accessToken: creds.accessToken,
    timeoutMs: 5000,
  });

  const { data, error } = await client.getMe();

  if (error || !data) {
    // Fallback to local credentials if API is unreachable
    console.log(`Email:  ${creds.user.email}`);
    console.log(`User:   ${creds.user.id}`);
    console.log(`Org:    ${creds.user.orgId ?? 'none'}`);
    return;
  }

  console.log(`Email:  ${data.user.email}`);
  if (data.user.name) {
    console.log(`Name:   ${data.user.name}`);
  }
  console.log(`User:   ${data.user.id}`);
  console.log(`Role:   ${data.user.role}`);

  if (data.org) {
    console.log(`Org:    ${data.org.name} (${data.org.slug})`);
  } else {
    console.log(`Org:    none`);
  }
}
