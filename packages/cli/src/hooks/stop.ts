#!/usr/bin/env node
// Stop hook — no-op
// Cleanup is handled by:
// - Activity-aware heartbeat daemon (locks expire when idle)
// - Server-side cleanup_expired_locks() via pg_cron
// - Daemon self-exit after prolonged inactivity

import { readHookInput } from '../lib/hook-io.js';

async function main() {
  // Consume stdin to satisfy hook protocol
  await readHookInput();
  // No action — intentionally empty
}

main();
