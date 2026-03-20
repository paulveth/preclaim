import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { defaultConfig, loadCredentials, saveCredentials } from '@preclaim/core';
import { loginCommand } from './login.js';
import { installHooksCommand } from './install-hooks.js';
import { checkForUpdate } from '../lib/version-check.js';

// ─── Agent detection ───

interface DetectedAgent {
  name: string;
  configPath: string;
  writeConfig: (projectRoot: string) => Promise<void>;
}

const MCP_ENTRY = {
  command: 'npx',
  args: ['@preclaim/mcp'],
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

async function detectAgents(projectRoot: string): Promise<DetectedAgent[]> {
  const agents: DetectedAgent[] = [];

  // Claude Code — .claude/ directory or running inside Claude Code
  if (await fileExists(join(projectRoot, '.claude', 'settings.json')) || process.env.CLAUDE_CODE) {
    agents.push({
      name: 'Claude Code',
      configPath: '.claude/settings.json',
      writeConfig: async () => {
        await installHooksCommand();
      },
    });
  }

  // Cursor — .cursor/ directory
  const cursorMcpPath = join(projectRoot, '.cursor', 'mcp.json');
  if (await fileExists(cursorMcpPath) || await fileExists(join(projectRoot, '.cursor', 'rules'))) {
    agents.push({
      name: 'Cursor',
      configPath: '.cursor/mcp.json',
      writeConfig: async () => {
        await writeMcpConfig(cursorMcpPath);
      },
    });
  }

  // Windsurf — .windsurf/ directory
  const windsurfMcpPath = join(projectRoot, '.windsurf', 'mcp.json');
  if (await fileExists(join(projectRoot, '.windsurf', 'rules')) || await fileExists(windsurfMcpPath)) {
    agents.push({
      name: 'Windsurf',
      configPath: '.windsurf/mcp.json',
      writeConfig: async () => {
        await writeMcpConfig(windsurfMcpPath);
      },
    });
  }

  // Cline — .cline/ directory
  const clineMcpPath = join(projectRoot, '.cline', 'mcp.json');
  if (await fileExists(join(projectRoot, '.cline', 'mcp_settings.json')) || await fileExists(join(projectRoot, '.cline', 'rules'))) {
    agents.push({
      name: 'Cline',
      configPath: '.cline/mcp.json',
      writeConfig: async () => {
        await writeMcpConfig(clineMcpPath);
      },
    });
  }

  return agents;
}

async function writeMcpConfig(configPath: string): Promise<void> {
  // Read existing config or create new
  let config: Record<string, unknown> = {};
  try {
    const raw = await readFile(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch {
    // File doesn't exist
  }

  // Merge preclaim into mcpServers
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
  mcpServers.preclaim = MCP_ENTRY;
  config.mcpServers = mcpServers;

  await mkdir(join(configPath, '..'), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

// ─── Init command ───

export async function initCommand(opts: { backend: string; projectId?: string }) {
  const projectRoot = process.cwd();
  const configPath = join(projectRoot, '.preclaim.json');
  const backend = opts.backend;

  // ─── Version check ───
  const updateNotice = await checkForUpdate();
  if (updateNotice) {
    console.log(updateNotice + '\n');
  }

  // ─── Step 1: Auth ───
  let creds = await loadCredentials();
  const configExists = await fileExists(configPath);

  if (!creds && !opts.projectId) {
    console.log('Not logged in. Starting authentication...\n');
    await loginCommand();
    creds = await loadCredentials();
    if (!creds) {
      console.error('Login failed. Please try again.');
      process.exit(1);
    }
    console.log('');
  }

  // ─── Step 2: Project setup ───
  if (!configExists) {
    if (opts.projectId) {
      const config = defaultConfig(opts.projectId, backend);
      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
      console.log(`Created .preclaim.json (project: ${opts.projectId})`);
    } else {
      const dirName = basename(projectRoot);
      const projectSlug = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      const projectName = dirName;

      console.log(`Setting up Preclaim for "${projectName}"...`);

      const res = await fetch(`${backend}/api/v1/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creds!.accessToken}`,
        },
        body: JSON.stringify({
          project_name: projectName,
          project_slug: projectSlug,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`Failed to create project: ${body}`);
        process.exit(1);
      }

      const { data } = await res.json() as { data: { project_id: string; org_id: string; already_existed: boolean } };

      if (data.already_existed) {
        console.log(`Project "${projectName}" already exists — joining.`);
      } else {
        console.log(`Project "${projectName}" created.`);
      }

      if (creds!.user.orgId !== data.org_id) {
        creds!.user.orgId = data.org_id;
        await saveCredentials(creds!);
      }

      const config = defaultConfig(data.project_id, backend);
      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
      console.log('Created .preclaim.json');
    }
  } else {
    console.log('.preclaim.json found — project already configured.');
  }

  // ─── Step 3: Detect agents and install integrations ───
  const agents = await detectAgents(projectRoot);

  if (agents.length === 0) {
    // No agent detected — install Claude Code hooks as default + show MCP instructions
    console.log('\nNo AI agent detected. Installing Claude Code hooks as default...');
    await installHooksCommand();
    console.log('\nUsing a different agent? Add this to your MCP config:\n');
    console.log(JSON.stringify({ mcpServers: { preclaim: MCP_ENTRY } }, null, 2));
  } else {
    console.log(`\nDetected: ${agents.map(a => a.name).join(', ')}`);
    for (const agent of agents) {
      console.log(`  Setting up ${agent.name}...`);
      await agent.writeConfig(projectRoot);
      console.log(`  ✓ ${agent.name} configured (${agent.configPath})`);
    }
  }

  // ─── Done ───
  const dashboardUrl = backend.replace(/\/api\/v1$/, '').replace(/\/$/, '');
  console.log('\n✓ Preclaim is ready.');
  console.log('  Commit .preclaim.json to your repo so your team can join.');
  console.log(`  Dashboard: ${dashboardUrl}/dashboard`);
}
