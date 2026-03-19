import type { Lock, ActivityEntry } from '@preclaim/core';

export function formatLock(lock: Lock): string {
  const acquired = new Date(lock.acquired_at).toLocaleTimeString();
  const expires = new Date(lock.expires_at).toLocaleTimeString();
  return `  ${lock.file_path}  (session: ${lock.session_id.slice(0, 8)}…  acquired: ${acquired}  expires: ${expires})`;
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
