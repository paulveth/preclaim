import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getToolDescription } from '@preclaim/core';
import { SessionManager } from './session.js';
import { handleLock } from './tools/lock.js';
import { handleUnlock } from './tools/unlock.js';
import { handleCheck } from './tools/check.js';
import { handleStatus } from './tools/status.js';
import { handleRead } from './tools/read.js';

const desc = getToolDescription;

export function createServer(): { server: McpServer; session: SessionManager } {
  const session = new SessionManager();

  const server = new McpServer({
    name: 'preclaim',
    version: '0.1.0',
  });

  server.tool(
    'preclaim_lock',
    desc('preclaim_lock'),
    {
      file_path: z.string().describe('Path to the file to lock (relative or absolute)'),
      ttl_minutes: z.number().optional().describe('Lock duration in minutes (default: from project config)'),
    },
    async (args) => handleLock(session, args),
  );

  server.tool(
    'preclaim_unlock',
    desc('preclaim_unlock'),
    {
      file_path: z.string().optional().describe('Specific file to unlock. Omit to release all locks.'),
      force: z.boolean().optional().describe('Force-release locks held by any session'),
    },
    async (args) => handleUnlock(session, args),
  );

  server.tool(
    'preclaim_check',
    desc('preclaim_check'),
    {
      file_paths: z.array(z.string()).min(1).max(100).describe('Files to check'),
    },
    async (args) => handleCheck(session, args),
  );

  server.tool(
    'preclaim_status',
    desc('preclaim_status'),
    {},
    async () => handleStatus(session),
  );

  server.tool(
    'preclaim_read',
    desc('preclaim_read'),
    {
      file_path: z.string().describe('Path to the file being read'),
    },
    async (args) => handleRead(session, args),
  );

  return { server, session };
}
