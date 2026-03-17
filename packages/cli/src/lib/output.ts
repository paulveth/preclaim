import type { Lock } from '@preclaim/core';

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
