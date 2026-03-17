import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultConfig } from '@preclaim/core';

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

  const backend = opts.backend ?? 'https://preclaim.dev';
  const projectId = opts.projectId ?? `proj_${crypto.randomUUID().slice(0, 8)}`;

  const config = defaultConfig(projectId, backend);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(`Created .preclaim.json (project: ${projectId})`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run `preclaim login` to authenticate');
  console.log('  2. Commit .preclaim.json to your repo');
  console.log('  3. Install Claude Code hooks: preclaim install-hooks');
}
