import { writeFile, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { defaultConfig, loadCredentials, PreclaimClient } from '@preclaim/core';
import { loginCommand } from './login.js';

const DEFAULT_BACKEND = 'https://preclaim.dev';

export async function initCommand(opts: { backend?: string; projectId?: string }) {
  const configPath = join(process.cwd(), '.preclaim.json');

  // Check if already exists
  try {
    await readFile(configPath, 'utf-8');
    console.log('.preclaim.json already exists. Use `preclaim config` to modify.');
    return;
  } catch {
    // File doesn't exist, proceed
  }

  const backend = opts.backend ?? DEFAULT_BACKEND;

  // If project ID provided directly, skip onboarding
  if (opts.projectId) {
    const config = defaultConfig(opts.projectId, backend);
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`Created .preclaim.json (project: ${opts.projectId})`);
    printNextSteps();
    return;
  }

  // Check if logged in, if not: login first
  let creds = await loadCredentials();
  if (!creds) {
    console.log('Not logged in. Starting authentication...\n');
    await loginCommand();
    creds = await loadCredentials();
    if (!creds) {
      console.error('Login failed. Please try again.');
      process.exit(1);
    }
    console.log('');
  }

  // Derive project name from directory
  const dirName = basename(process.cwd());
  const projectSlug = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const projectName = dirName;

  console.log(`Setting up Preclaim for "${projectName}"...`);

  // Call onboard API
  const client = new PreclaimClient({
    baseUrl: backend,
    accessToken: creds.accessToken,
    timeoutMs: 10000,
  });

  const res = await fetch(`${backend}/api/v1/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.accessToken}`,
    },
    body: JSON.stringify({
      project_name: projectName,
      project_slug: projectSlug,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed to create project: ${body}`);
    process.exit(1);
  }

  const { data } = await res.json() as { data: { project_id: string; org_id: string; already_existed: boolean } };

  if (data.already_existed) {
    console.log(`Project "${projectName}" already exists, using existing project.`);
  } else {
    console.log(`Project "${projectName}" created.`);
  }

  // Update credentials with org_id
  if (creds.user.orgId !== data.org_id) {
    creds.user.orgId = data.org_id;
    const { getCredentialsPath } = await import('@preclaim/core');
    const { writeFile: wf, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const credPath = getCredentialsPath();
    await mkdir(dirname(credPath), { recursive: true });
    await wf(credPath, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
  }

  // Write config
  const config = defaultConfig(data.project_id, backend);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(`\nCreated .preclaim.json`);
  printNextSteps();
}

function printNextSteps() {
  console.log('');
  console.log('Next steps:');
  console.log('  1. preclaim install-hooks');
  console.log('  2. Commit .preclaim.json to your repo');
  console.log('  3. Open multiple Claude Code terminals — locks are automatic');
}
