import { readFile, writeFile } from 'node:fs/promises';
import { findConfig, type PreclaimConfig } from '@preclaim/core';

export async function configCommand(opts: { get?: string; set?: string }) {
  const found = await findConfig();
  if (!found) {
    console.error('No .preclaim.json found. Run `preclaim init` first.');
    process.exit(1);
  }

  if (opts.get) {
    const value = found.config[opts.get as keyof PreclaimConfig];
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (opts.set) {
    const [key, ...rest] = opts.set.split('=');
    const value = rest.join('=');

    if (!key || !value) {
      console.error('Usage: preclaim config --set key=value');
      process.exit(1);
    }

    const raw = await readFile(found.configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    // Try to parse as JSON, fallback to string
    try {
      config[key] = JSON.parse(value);
    } catch {
      config[key] = value;
    }

    await writeFile(found.configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`Set ${key} = ${JSON.stringify(config[key])}`);
    return;
  }

  // No flags — show full config
  console.log(JSON.stringify(found.config, null, 2));
}
