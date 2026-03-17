import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolve, relative } from 'node:path';

// Path normalization logic (extracted for testing)
function normalizeLockPath(filePath: string, projectRoot: string): string {
  const absolutePath = resolve(projectRoot, filePath);
  return relative(projectRoot, absolutePath);
}

describe('normalizeLockPath', () => {
  it('converts absolute path to relative', () => {
    const result = normalizeLockPath('/Users/paul/project/src/file.ts', '/Users/paul/project');
    expect(result).toBe('src/file.ts');
  });

  it('keeps relative path as-is', () => {
    const result = normalizeLockPath('src/file.ts', '/Users/paul/project');
    expect(result).toBe('src/file.ts');
  });

  it('normalizes double slashes', () => {
    const result = normalizeLockPath('src//utils//file.ts', '/Users/paul/project');
    expect(result).toBe('src/utils/file.ts');
  });

  it('normalizes parent traversals', () => {
    const result = normalizeLockPath('src/../lib/file.ts', '/Users/paul/project');
    expect(result).toBe('lib/file.ts');
  });

  it('absolute and relative resolve to same path', () => {
    const root = '/Users/paul/project';
    const fromAbsolute = normalizeLockPath('/Users/paul/project/src/file.ts', root);
    const fromRelative = normalizeLockPath('src/file.ts', root);
    expect(fromAbsolute).toBe(fromRelative);
  });
});

describe('getSupabaseConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('returns default values when env vars are not set', async () => {
    const { getSupabaseConfig } = await import('./config.js');
    const config = getSupabaseConfig();
    expect(config.url).toContain('supabase.co');
    expect(config.anonKey).toBeTruthy();
  });

  it('uses env vars when set', async () => {
    process.env = {
      ...originalEnv,
      PRECLAIM_SUPABASE_URL: 'https://staging.supabase.co',
      PRECLAIM_SUPABASE_ANON_KEY: 'test-key',
    };
    vi.resetModules();
    const { getSupabaseConfig } = await import('./config.js');
    const config = getSupabaseConfig();
    expect(config.url).toBe('https://staging.supabase.co');
    expect(config.anonKey).toBe('test-key');
  });
});
