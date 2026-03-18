#!/usr/bin/env node
// Heartbeat daemon — runs as detached background process
// Extends TTL on all session locks every 60s, but only when the session is active.
// Stops heartbeating when idle, exits after prolonged inactivity.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PreclaimClient } from '@preclaim/core';

const sessionId = process.env.PRECLAIM_SESSION_ID;
const backend = process.env.PRECLAIM_BACKEND;
const accessToken = process.env.PRECLAIM_ACCESS_TOKEN;
const idleTimeoutMinutes = parseInt(process.env.PRECLAIM_IDLE_TIMEOUT ?? '15', 10);

if (!sessionId || !backend || !accessToken) {
  process.exit(1);
}

const client = new PreclaimClient({
  baseUrl: backend,
  accessToken,
  timeoutMs: 5000,
});

const INTERVAL_MS = 60_000;
const MAX_FAILURES = 5;
const MAX_IDLE_TICKS = 30; // 30 ticks × 60s = 30 min without activity → daemon exits

let failures = 0;
let idleTicks = 0;

const activityFile = join(process.cwd(), '.preclaim.activity');

async function getLastActivity(): Promise<number> {
  try {
    const raw = await readFile(activityFile, 'utf-8');
    return parseInt(raw.trim(), 10);
  } catch {
    return 0;
  }
}

async function heartbeat() {
  // Check if access token has likely expired (JWT default: 1 hour)
  const uptimeMs = Date.now() - startTime;
  if (uptimeMs > 55 * 60 * 1000) {
    failures++;
    if (failures >= MAX_FAILURES) {
      process.exit(1);
    }
    return;
  }

  // Check activity
  const lastActivity = await getLastActivity();
  const idleMs = Date.now() - lastActivity;
  const idleMinutes = idleMs / 60_000;

  if (lastActivity === 0 || idleMinutes >= idleTimeoutMinutes) {
    // Session is idle — skip heartbeat, let locks expire via server TTL
    idleTicks++;
    if (idleTicks >= MAX_IDLE_TICKS) {
      // Prolonged inactivity — self-cleanup
      process.exit(0);
    }
    return;
  }

  // Session is active — reset idle counter and send heartbeat
  idleTicks = 0;

  const result = await client.heartbeat({ session_id: sessionId! });

  if (result.error) {
    failures++;
    if (failures >= MAX_FAILURES) {
      process.exit(1);
    }
  } else {
    failures = 0;
  }
}

const startTime = Date.now();

// Run immediately, then every 60s
heartbeat();
const interval = setInterval(heartbeat, INTERVAL_MS);

// Cleanup on signals
function shutdown() {
  clearInterval(interval);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
