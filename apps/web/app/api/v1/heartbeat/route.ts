import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import type { HeartbeatRequest } from '@preclaim/core';

// POST /api/v1/heartbeat — Extend TTL on all session locks
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json() as HeartbeatRequest;

  // Update session heartbeat
  await auth.supabase
    .from('sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('id', body.session_id)
    .eq('user_id', auth.user.id);

  // Extend TTL on all locks for this session
  const { data: locks } = await auth.supabase
    .from('locks')
    .select('id, project_id')
    .eq('session_id', body.session_id);

  if (locks && locks.length > 0) {
    // Get project default TTL
    const projectIds = [...new Set(locks.map(l => l.project_id))];
    const { data: projects } = await auth.supabase
      .from('projects')
      .select('id, default_ttl')
      .in('id', projectIds);

    const ttlMap = new Map(projects?.map(p => [p.id, p.default_ttl]) ?? []);

    for (const lock of locks) {
      const ttl = ttlMap.get(lock.project_id) ?? 30;
      const newExpiry = new Date(Date.now() + ttl * 60 * 1000).toISOString();
      await auth.supabase
        .from('locks')
        .update({ expires_at: newExpiry })
        .eq('id', lock.id);
    }
  }

  return Response.json({ data: { extended: locks?.length ?? 0 } });
}
