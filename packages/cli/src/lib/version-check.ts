import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: LOCAL_VERSION } = require('../../package.json') as { version: string };

export { LOCAL_VERSION };

/**
 * Check npm registry for a newer version. Returns the update notice string
 * if an update is available, or null if up-to-date / on error.
 * Non-blocking: 2s timeout, never throws.
 */
export async function checkForUpdate(): Promise<string | null> {
  try {
    const res = await fetch('https://registry.npmjs.org/preclaim/latest', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;

    const { version: latest } = await res.json() as { version: string };
    if (latest !== LOCAL_VERSION) {
      return `Update available: ${LOCAL_VERSION} → ${latest}. Run \`preclaim upgrade\` to update.`;
    }
    return null;
  } catch {
    return null;
  }
}
