#!/usr/bin/env node
// Heartbeat daemon — runs as detached background process
// Extends TTL on all session locks every 60s

import { PreclaimClient } from '@preclaim/core';

const sessionId = process.env.PRECLAIM_SESSION_ID;
const backend = process.env.PRECLAIM_BACKEND;
const accessToken = process.env.PRECLAIM_ACCESS_TOKEN;

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
let failures = 0;

async function heartbeat() {
  // Check if access token has likely expired (JWT default: 1 hour)
  // If daemon has been running > 55 min, count it as a failure
  const uptimeMs = Date.now() - startTime;
  if (uptimeMs > 55 * 60 * 1000) {
    failures++;
    if (failures >= MAX_FAILURES) {
      process.exit(1);
    }
    return;
  }

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
