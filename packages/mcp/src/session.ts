import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import {
  PreclaimClient,
  loadCredentials,
  refreshCredentials,
  type PreclaimConfig,
  type PreclaimCredentials,
} from '@preclaim/core';
import { loadContext, type PreclaimContext } from './lib/context.js';

const require = createRequire(import.meta.url);
const { version: LOCAL_VERSION } = require('../package.json') as { version: string };

const HEARTBEAT_INTERVAL_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 5;

export class SessionManager {
  private sessionId: string | null = null;
  private client: PreclaimClient | null = null;
  private config: PreclaimConfig | null = null;
  private projectRoot: string | null = null;
  private credentials: PreclaimCredentials | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = 0;
  private initPromise: Promise<void> | null = null;
  updateNotice: string | null = null;

  get id(): string | null {
    return this.sessionId;
  }

  async ensureInitialized(): Promise<PreclaimContext & { sessionId: string }> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;

    return {
      client: this.client!,
      config: this.config!,
      projectRoot: this.projectRoot!,
      credentials: this.credentials!,
      sessionId: this.sessionId!,
    };
  }

  private async initialize(): Promise<void> {
    const ctx = await loadContext();

    this.client = ctx.client;
    this.config = ctx.config;
    this.projectRoot = ctx.projectRoot;
    this.credentials = ctx.credentials;
    this.sessionId = randomUUID();

    // Register session with provider 'mcp'
    const result = await this.client.registerSession({
      session_id: this.sessionId,
      project_id: this.config.projectId,
      provider: 'mcp',
    });

    if (result.error) {
      // Reset state so next call retries
      this.initPromise = null;
      throw new Error(`Failed to register session: ${result.error}`);
    }

    this.startHeartbeat();

    // Non-blocking version check
    this.checkForUpdate();
  }

  private async checkForUpdate(): Promise<void> {
    try {
      const res = await fetch('https://registry.npmjs.org/@preclaim/mcp/latest', {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return;
      const { version: latest } = await res.json() as { version: string };
      if (latest !== LOCAL_VERSION) {
        this.updateNotice = `Update available: @preclaim/mcp ${LOCAL_VERSION} → ${latest}. Run: npm install -g @preclaim/mcp@latest`;
      }
    } catch {
      // Non-blocking — ignore failures
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        // Refresh credentials if near expiry
        await this.refreshIfNeeded();

        const result = await this.client!.heartbeat({
          session_id: this.sessionId!,
        });

        if (result.error) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            process.stderr.write(`[preclaim-mcp] ${MAX_CONSECUTIVE_FAILURES} consecutive heartbeat failures\n`);
          }
        } else {
          this.consecutiveFailures = 0;
        }
      } catch {
        this.consecutiveFailures++;
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Don't prevent process exit
    this.heartbeatInterval.unref();
  }

  private async refreshIfNeeded(): Promise<void> {
    if (!this.credentials) return;

    const expiresAt = new Date(this.credentials.expiresAt).getTime();
    if (Date.now() < expiresAt - 60_000) return;

    const refreshed = await refreshCredentials();
    if (!refreshed) return;

    this.credentials = refreshed;
    this.client = new PreclaimClient({
      baseUrl: this.config!.backend,
      accessToken: refreshed.accessToken,
      timeoutMs: 5000,
    });
  }

  async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.client && this.sessionId) {
      try {
        await this.client.endSession(this.sessionId);
      } catch {
        // Best-effort — server TTL will clean up
      }
    }
  }
}
