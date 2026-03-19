#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const { server, session } = createServer();

// Graceful shutdown
async function shutdown() {
  await session.cleanup();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
