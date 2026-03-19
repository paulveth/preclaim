export const PRECLAIM_API_VERSION = "v1";

import type {
  ActivityEntry,
  ApiResponse,
  ClaimRequest,
  ClaimResult,
  BatchCheckRequest,
  BatchCheckResult,
  HeartbeatRequest,
  HeartbeatResult,
  SessionRegisterRequest,
  ReleaseRequest,
  ReleaseResult,
  Lock,
  VersionResult,
} from './types.js';

export class PreclaimClient {
  private baseUrl: string;
  private accessToken: string;
  private timeoutMs: number;

  constructor(opts: { baseUrl: string; accessToken: string; timeoutMs?: number }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.accessToken = opts.accessToken;
    this.timeoutMs = opts.timeoutMs ?? 5000;
  }

  private async request<T>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
    const start = Date.now();
    const url = `${this.baseUrl}/api/v1${path}`;

    try {
      const res = await fetch(url, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          ...opts.headers,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        const body = await res.text();
        return { error: `HTTP ${res.status}: ${body}` };
      }

      const body = await res.json() as { data?: T; error?: string };
      if (body.error) {
        return { error: body.error };
      }
      return { data: body.data as T };
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      if (err instanceof Error && err.name === 'TimeoutError') {
        return { error: `Request timeout after ${elapsed}ms` };
      }
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async claimFile(req: ClaimRequest): Promise<ApiResponse<ClaimResult>> {
    // Special handling: 409 is a valid conflict response, not an error
    try {
      const url = `${this.baseUrl}/api/v1/locks`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.status === 409 || res.ok) {
        const body = await res.json() as { data?: ClaimResult; error?: string };
        if (body.error) return { error: body.error };
        return { data: body.data as ClaimResult };
      }

      const body = await res.text();
      return { error: `HTTP ${res.status}: ${body}` };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return { error: `Request timeout` };
      }
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async releaseLocks(req: ReleaseRequest): Promise<ApiResponse<ReleaseResult>> {
    return this.request<ReleaseResult>('/locks', {
      method: 'DELETE',
      body: JSON.stringify(req),
    });
  }

  async listLocks(projectId: string): Promise<ApiResponse<Lock[]>> {
    return this.request<Lock[]>(`/locks?project_id=${projectId}`);
  }

  async batchCheck(req: BatchCheckRequest): Promise<ApiResponse<BatchCheckResult>> {
    return this.request<BatchCheckResult>('/locks/check', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async heartbeat(req: HeartbeatRequest): Promise<ApiResponse<HeartbeatResult>> {
    return this.request<HeartbeatResult>('/heartbeat', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async registerSession(req: SessionRegisterRequest): Promise<ApiResponse<{ session_id: string }>> {
    return this.request<{ session_id: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async endSession(sessionId: string): Promise<ApiResponse<ReleaseResult>> {
    return this.request<ReleaseResult>('/sessions', {
      method: 'DELETE',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  async getVersion(): Promise<ApiResponse<VersionResult>> {
    return this.request<VersionResult>('/version');
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    const res = await this.getVersion();
    const latencyMs = Date.now() - start;

    if (res.error) {
      return { ok: false, latencyMs, error: res.error };
    }
    return { ok: true, latencyMs };
  }
}
