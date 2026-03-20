import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: currentVersion } = require('../../package.json') as { version: string };

export async function upgradeCommand() {
  console.log(`Current version: ${currentVersion}`);

  // Check latest version from npm
  let latestVersion: string;
  try {
    latestVersion = execSync('npm view preclaim version', { encoding: 'utf-8' }).trim();
  } catch {
    console.error('Could not check latest version. Are you online?');
    process.exit(1);
  }

  if (latestVersion === currentVersion) {
    console.log('Already on the latest version.');
    return;
  }

  console.log(`Latest version:  ${latestVersion}`);
  console.log('Upgrading...\n');

  // Detect how preclaim was installed and use that package manager
  const execPath = process.argv[1] ?? '';

  let cmd: string;
  if (execPath.includes('pnpm')) {
    cmd = 'pnpm add -g preclaim@latest';
  } else if (execPath.includes('yarn')) {
    cmd = 'yarn global add preclaim@latest';
  } else if (execPath.includes('bun')) {
    cmd = 'bun add -g preclaim@latest';
  } else {
    cmd = 'npm install -g preclaim@latest';
  }

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`\nUpgraded to ${latestVersion}`);
  } catch {
    console.error(`\nUpgrade failed. Try manually: ${cmd}`);
    process.exit(1);
  }
}
