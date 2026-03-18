import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { PreclaimConfig, PreclaimCredentials } from './types.js';

const CONFIG_FILENAME = '.preclaim.json';
const CREDENTIALS_DIR = '.preclaim';
const CREDENTIALS_FILENAME = 'credentials.json';

// Supabase config — env vars met fallback voor development
const DEFAULT_SUPABASE_URL = 'https://aawbukcvngdffueowjsa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd2J1a2N2bmdkZmZ1ZW93anNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjI2NTcsImV4cCI6MjA4OTMzODY1N30.pwAyjgnbdoZmmJdsG2jF0nbvT4hueb8UZvstsdYhFFs';

export function getSupabaseConfig() {
  return {
    url: process.env.PRECLAIM_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
    anonKey: process.env.PRECLAIM_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY,
  };
}

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
    idleTimeoutMinutes: 15,
  };
}

export async function saveCredentials(creds: PreclaimCredentials): Promise<void> {
  const credPath = getCredentialsPath();
  await mkdir(dirname(credPath), { recursive: true });
  await writeFile(credPath, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
}

// Token refresh via Supabase REST API
export async function refreshCredentials(): Promise<PreclaimCredentials | null> {
  const creds = await loadCredentials();
  if (!creds?.refreshToken) return null;

  const { url, anonKey } = getSupabaseConfig();

  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ refresh_token: creds.refreshToken }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: { id: string; email?: string };
    };

    const refreshed: PreclaimCredentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      user: {
        id: data.user.id,
        email: data.user.email ?? creds.user.email,
        orgId: creds.user.orgId,
      },
    };

    await saveCredentials(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}
