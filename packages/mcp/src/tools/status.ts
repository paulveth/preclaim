import type { SessionManager } from '../session.js';
import { withFailOpen } from '../lib/fail-open.js';
import type { Lock, SessionWithProfile } from '@preclaim/core';

export async function handleStatus(session: SessionManager) {
  const ctx = await session.ensureInitialized();

  const [locksResult, sessionsResult] = await Promise.all([
    withFailOpen(ctx.config, () => ctx.client.listLocks(ctx.config.projectId), 'Could not fetch locks'),
    withFailOpen(ctx.config, () => ctx.client.listSessions(ctx.config.projectId), 'Could not fetch sessions'),
  ]);

  const lines: string[] = [];

  // Sessions
  if (sessionsResult.warning) {
    lines.push(`Sessions: ${sessionsResult.warning}`);
  } else if (sessionsResult.error) {
    lines.push(`Sessions: error — ${sessionsResult.error}`);
  } else {
    const sessions = sessionsResult.data as SessionWithProfile[];
    lines.push(`Sessions (${sessions.length}):`);
    for (const s of sessions) {
      const name = s.profiles?.name ?? s.profiles?.email ?? 'unknown';
      const isSelf = s.id === ctx.sessionId ? ' (this session)' : '';
      lines.push(`  ${s.id.slice(0, 8)}… ${name} [${s.provider}]${isSelf}`);
    }
  }

  lines.push('');

  // Locks
  if (locksResult.warning) {
    lines.push(`Locks: ${locksResult.warning}`);
  } else if (locksResult.error) {
    lines.push(`Locks: error — ${locksResult.error}`);
  } else {
    const locks = locksResult.data as Lock[];
    const active = locks.filter(l => new Date(l.expires_at) > new Date());
    lines.push(`Active locks (${active.length}):`);
    if (active.length === 0) {
      lines.push('  No active locks.');
    }
    for (const l of active) {
      const isSelf = l.session_id === ctx.sessionId ? ' (yours)' : '';
      lines.push(`  ${l.file_path} — session ${l.session_id.slice(0, 8)}…${isSelf} (expires: ${new Date(l.expires_at).toLocaleTimeString()})`);
    }
  }

  if (session.updateNotice) {
    lines.push('', session.updateNotice);
  }

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}
