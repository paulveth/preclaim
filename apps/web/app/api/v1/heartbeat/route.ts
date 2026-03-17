import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import { HeartbeatRequestSchema } from '../../../../lib/schemas';

// POST /api/v1/heartbeat — Extend TTL on all session locks
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = HeartbeatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Update session heartbeat
  await auth.supabase
    .from('sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('id', body.session_id)
    .eq('user_id', auth.user.id);

  // Get project default TTL for bulk update
  const { data: locks } = await auth.supabase
    .from('locks')
    .select('project_id')
    .eq('session_id', body.session_id);

  if (!locks || locks.length === 0) {
    return Response.json({ data: { extended: 0 } });
  }

  // Get TTL per project
  const projectIds = [...new Set(locks.map(l => l.project_id))];
  const { data: projects } = await auth.supabase
    .from('projects')
    .select('id, default_ttl')
    .in('id', projectIds);

  // Bulk update per project (1 query per project instead of N per lock)
  let totalExtended = 0;
  for (const project of projects ?? []) {
    const ttl = project.default_ttl ?? 30;
    const newExpiry = new Date(Date.now() + ttl * 60 * 1000).toISOString();

    const { count } = await auth.supabase
      .from('locks')
      .update({ expires_at: newExpiry }, { count: 'exact' })
      .eq('session_id', body.session_id)
      .eq('project_id', project.id);

    totalExtended += count ?? 0;
  }

  return Response.json({ data: { extended: totalExtended } });
}
