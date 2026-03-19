import type { Lock, ActivityEntry, SessionWithProfile } from '@preclaim/core';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${parseFloat(value.toFixed(1))} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function formatLock(lock: Lock): string {
  const acquired = new Date(lock.acquired_at).toLocaleTimeString();
  const expires = new Date(lock.expires_at).toLocaleTimeString();
  return `  ${lock.file_path}  (session: ${lock.session_id.slice(0, 8)}…  acquired: ${acquired}  expires: ${expires})`;
}

export function formatSession(session: SessionWithProfile): string {
  const name = session.profiles.name ?? session.profiles.email;
  const started = new Date(session.started_at).toLocaleString();
  const heartbeat = new Date(session.last_heartbeat).toLocaleString();
  return `  ${session.id.slice(0, 8)}…  ${name}  (provider: ${session.provider}  started: ${started}  heartbeat: ${heartbeat})`;
}

export function formatSessionTable(sessions: SessionWithProfile[]): string {
  if (sessions.length === 0) {
    return 'No active sessions.';
  }

  const lines = ['Active sessions:', ''];
  for (const session of sessions) {
    lines.push(formatSession(session));
  }
  lines.push('', `Total: ${sessions.length} session(s)`);
  return lines.join('\n');
}

export function formatLockTable(locks: Lock[]): string {
  if (locks.length === 0) {
    return 'No active locks.';
  }

  const lines = ['Active locks:', ''];
  for (const lock of locks) {
    lines.push(formatLock(lock));
  }
  lines.push('', `Total: ${locks.length} lock(s)`);
  return lines.join('\n');
}

const ACTION_LABELS: Record<string, string> = {
  acquire: 'LOCK',
  release: 'UNLOCK',
  expire: 'EXPIRED',
  force_release: 'FORCE',
};

export function formatActivityTable(entries: ActivityEntry[]): string {
  if (entries.length === 0) {
    return 'No recent activity.';
  }

  const lines = ['Recent activity:', ''];
  for (const entry of entries) {
    const time = new Date(entry.created_at).toLocaleString();
    const label = ACTION_LABELS[entry.action] ?? entry.action;
    const user = entry.profiles.name ?? entry.profiles.email;
    lines.push(`  ${label.padEnd(7)}  ${entry.file_path}  (${user}  ${time})`);
  }
  lines.push('', `Showing ${entries.length} entries`);
  return lines.join('\n');
}
