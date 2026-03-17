import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import type { ClaimRequest, ReleaseRequest } from '@preclaim/core';

// POST /api/v1/locks — Claim a file lock
export async function POST(req: NextRequest) {
  const start = Date.now();

  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json() as ClaimRequest;

  const { data, error } = await auth.supabase.rpc('claim_file', {
    p_project_id: body.project_id,
    p_file_path: body.file_path,
    p_session_id: body.session_id,
    p_user_id: auth.user.id,
    p_ttl_minutes: body.ttl_minutes ?? 30,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const status = data?.status === 'conflict' ? 409 : 200;
  return Response.json({ data }, { status });
}

// GET /api/v1/locks?project_id=xxx — List active locks
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('locks')
    .select('*')
    .eq('project_id', projectId)
    .order('acquired_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

// DELETE /api/v1/locks — Release locks
export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json() as ReleaseRequest;

  let query = auth.supabase
    .from('locks')
    .delete()
    .eq('project_id', body.project_id)
    .eq('session_id', body.session_id);

  if (body.file_path) {
    query = query.eq('file_path', body.file_path);
  }

  // Log releases before deleting
  const { data: locksToRelease } = await auth.supabase
    .from('locks')
    .select('*')
    .eq('project_id', body.project_id)
    .eq('session_id', body.session_id);

  if (locksToRelease && locksToRelease.length > 0) {
    const historyEntries = locksToRelease
      .filter(l => !body.file_path || l.file_path === body.file_path)
      .map(l => ({
        project_id: l.project_id,
        file_path: l.file_path,
        user_id: l.user_id,
        session_id: l.session_id,
        provider: 'claude-code',
        action: 'release' as const,
      }));

    if (historyEntries.length > 0) {
      await auth.supabase.from('lock_history').insert(historyEntries);
    }
  }

  const { error, count } = await query.select();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: { released: count ?? 0 } });
}
