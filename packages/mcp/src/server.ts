import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SessionManager } from './session.js';
import { handleLock } from './tools/lock.js';
import { handleUnlock } from './tools/unlock.js';
import { handleCheck } from './tools/check.js';
import { handleStatus } from './tools/status.js';
import { handleRead } from './tools/read.js';

export function createServer(): { server: McpServer; session: SessionManager } {
  const session = new SessionManager();

  const server = new McpServer({
    name: 'preclaim',
    version: '0.1.0',
  });

  server.tool(
    'preclaim_lock',
    'Lock a file before editing it. Call this BEFORE writing to any file to prevent conflicts with other AI sessions. Returns whether the lock was acquired or if another session holds it.',
    {
      file_path: z.string().describe('Path to the file to lock (relative or absolute)'),
      ttl_minutes: z.number().optional().describe('Lock duration in minutes (default: from project config)'),
    },
    async (args) => handleLock(session, args),
  );

  server.tool(
    'preclaim_unlock',
    'Release a lock on a file, or all locks for this session. Call this after committing changes.',
    {
      file_path: z.string().optional().describe('Specific file to unlock. Omit to release all locks.'),
    },
    async (args) => handleUnlock(session, args),
  );

  server.tool(
    'preclaim_check',
    'Check lock status of one or more files without acquiring locks. Use this to see if files are available before editing.',
    {
      file_paths: z.array(z.string()).min(1).max(100).describe('Files to check'),
    },
    async (args) => handleCheck(session, args),
  );

  server.tool(
    'preclaim_status',
    'List all active locks and sessions for this project. Shows who is working on what.',
    {},
    async () => handleStatus(session),
  );

  server.tool(
    'preclaim_read',
    'Signal that you are reading a file. This lets other sessions know you are looking at this file (soft signal, 60s TTL). Call this when reading files to improve coordination.',
    {
      file_path: z.string().describe('Path to the file being read'),
    },
    async (args) => handleRead(session, args),
  );

  return { server, session };
}
