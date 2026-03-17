import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PreclaimConfig, PreclaimCredentials } from './types.js';

const CONFIG_FILENAME = '.preclaim.json';
const CREDENTIALS_DIR = '.preclaim';
const CREDENTIALS_FILENAME = 'credentials.json';

export async function findConfig(startDir: string = process.cwd()): Promise<{ config: PreclaimConfig; configPath: string } | null> {
  let dir = startDir;
  const root = '/';

  while (dir !== root) {
    const configPath = join(dir, CONFIG_FILENAME);
    try {
      const raw = await readFile(configPath, 'utf-8');
      return { config: JSON.parse(raw) as PreclaimConfig, configPath };
    } catch {
      dir = join(dir, '..');
    }
  }

  return null;
}

export function getCredentialsPath(): string {
  return join(homedir(), CREDENTIALS_DIR, CREDENTIALS_FILENAME);
}

export async function loadCredentials(): Promise<PreclaimCredentials | null> {
  try {
    const raw = await readFile(getCredentialsPath(), 'utf-8');
    return JSON.parse(raw) as PreclaimCredentials;
  } catch {
    return null;
  }
}

export function defaultConfig(projectId: string, backend: string): PreclaimConfig {
  return {
    version: 1,
    projectId,
    backend,
    ttl: 30,
    failOpen: true,
    ignore: ['*.md', 'package-lock.json', '*.test.ts'],
  };
}
