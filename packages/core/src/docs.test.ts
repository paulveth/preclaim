import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliCommands, mcpTools } from './docs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const README = readFileSync(join(__dirname, '../../../README.md'), 'utf-8');
const CLI_INDEX = readFileSync(join(__dirname, '../../cli/src/index.ts'), 'utf-8');
const MCP_SERVER = readFileSync(join(__dirname, '../../mcp/src/server.ts'), 'utf-8');

describe('docs.ts sync', () => {
  describe('CLI commands vs README', () => {
    const readmeCommands = [...README.matchAll(/\| `preclaim ([\w-]+)/g)].map(m => m[1]);

    for (const cmd of cliCommands) {
      it(`"preclaim ${cmd.name}" should be in README CLI table`, () => {
        expect(readmeCommands).toContain(cmd.name);
      });
    }
  });

  describe('CLI commands vs index.ts', () => {
    // Extract registered commands from CLI index (e.g. .command('init'), .command('lock <file>'))
    const registeredCommands = [...CLI_INDEX.matchAll(/\.command\('(\w[\w-]*)/g)]
      .map(m => m[1])
      .filter(name => name !== 'hook' && name !== 'pre-tool-use' && name !== 'post-tool-use' && name !== 'session-start' && name !== 'stop');

    for (const cmd of cliCommands) {
      it(`"${cmd.name}" should be registered in CLI index.ts`, () => {
        expect(registeredCommands).toContain(cmd.name);
      });
    }

    for (const name of registeredCommands) {
      it(`registered command "${name}" should be documented in docs.ts`, () => {
        expect(cliCommands.map(c => c.name)).toContain(name);
      });
    }
  });

  describe('MCP tools vs README', () => {
    const readmeTools = [...README.matchAll(/\| `(preclaim_\w+)`/g)].map(m => m[1]);

    for (const tool of mcpTools) {
      it(`"${tool.name}" should be in README MCP table`, () => {
        expect(readmeTools).toContain(tool.name);
      });
    }
  });

  describe('MCP tools vs server.ts', () => {
    // Extract registered tools from MCP server (e.g. server.tool('preclaim_lock', ...))
    const registeredTools = [...MCP_SERVER.matchAll(/server\.tool\(\s*'(preclaim_\w+)'/g)].map(m => m[1]);

    for (const tool of mcpTools) {
      it(`"${tool.name}" should be registered in MCP server.ts`, () => {
        expect(registeredTools).toContain(tool.name);
      });
    }

    for (const name of registeredTools) {
      it(`registered tool "${name}" should be documented in docs.ts`, () => {
        expect(mcpTools.map(t => t.name)).toContain(name);
      });
    }
  });
});
