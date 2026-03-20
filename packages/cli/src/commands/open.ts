import { exec } from 'node:child_process';
import { findConfig } from '@preclaim/core';

export async function openCommand() {
  const found = await findConfig();
  if (!found) {
    console.error('No .preclaim.json found. Run `preclaim init` first.');
    process.exit(1);
  }

  const url = `${found.config.backend}/projects/${found.config.projectId}`;

  const cmd = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';

  exec(`${cmd} ${url}`, (err) => {
    if (err) {
      // Fallback: print the URL
      console.log(`Could not open browser. Visit: ${url}`);
      return;
    }
    console.log(`Opened ${url}`);
  });
}
