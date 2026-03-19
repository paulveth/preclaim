// === Organizations ===
export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// === Profiles ===
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  org_id: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

// === Projects ===
export interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  repo_url: string | null;
  default_ttl: number;
  created_at: string;
}

// === Sessions ===
export interface Session {
  id: string;
  user_id: string;
  project_id: string;
  provider: string;
  started_at: string;
  last_heartbeat: string;
  metadata: Record<string, unknown>;
}

export interface SessionWithProfile extends Session {
  profiles: { name: string | null; email: string; avatar_url: string | null };
}

// === Locks ===
export interface Lock {
  id: string;
  project_id: string;
  file_path: string;
  session_id: string;
  user_id: string;
  acquired_at: string;
  expires_at: string;
  message: string | null;
}

export interface LockHolder {
  user_id: string;
  session_id: string;
  acquired_at: string;
  expires_at: string;
}

// === Lock History ===
export interface LockHistoryEntry {
  id: string;
  project_id: string;
  file_path: string;
  user_id: string;
  session_id: string;
  provider: string;
  action: 'acquire' | 'release' | 'expire' | 'force_release';
  created_at: string;
}

export interface ActivityEntry extends LockHistoryEntry {
  profiles: { name: string | null; email: string; avatar_url: string | null };
}

// === API Types ===
export type ClaimStatus = 'acquired' | 'already_held' | 'conflict';

export interface ClaimResult {
  status: ClaimStatus;
  expires_at?: string;
  holder?: LockHolder;
}

export interface ClaimRequest {
  project_id: string;
  file_path: string;
  session_id: string;
  ttl_minutes?: number;
}

export interface BatchCheckRequest {
  project_id: string;
  file_paths: string[];
}

export interface BatchCheckResult {
  locks: Record<string, Lock | null>;
}

export interface HeartbeatRequest {
  session_id: string;
}

export interface HeartbeatResult {
  extended: number;
}

export interface SessionRegisterRequest {
  session_id: string;
  project_id: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface ReleaseRequest {
  project_id: string;
  file_path?: string;
  session_id: string;
}

export interface ReleaseResult {
  released: number;
}

// === Stats ===
export interface StatsResult {
  active_locks: number;
  active_sessions: number;
  activity_today: number;
  files_today: number;
}

// === Version ===
export interface VersionResult {
  version: string;
}

// === Config ===
export interface PreclaimConfig {
  version: number;
  projectId: string;
  backend: string;
  ttl: number;
  failOpen: boolean;
  ignore: string[];
  idleTimeoutMinutes?: number;
}

// === Credentials ===
export interface PreclaimCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    orgId: string;
  };
}

// === Me (whoami) ===
export interface MeResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: 'admin' | 'member';
  };
  org: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// === API Response Wrapper ===
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// === Hook Types ===
export interface HookInput {
  session_id: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

export interface HookResult {
  permissionDecision?: 'allow' | 'deny';
  reason?: string;
  systemMessage?: string;
}
