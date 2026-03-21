import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import { ClaimRequestSchema, ReleaseRequestSchema } from '../../../../lib/schemas';

// POST /api/v1/locks — Claim a file lock
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = ClaimRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

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

  const parsed = ReleaseRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  const isForce = body.force === true;
  const action = isForce ? 'force_release' as const : 'release' as const;

  // Get locks to release (for history logging)
  let selectQuery = auth.supabase
    .from('locks')
    .select('*')
    .eq('project_id', body.project_id);

  if (!isForce && body.session_id) {
    selectQuery = selectQuery.eq('session_id', body.session_id);
  }

  if (body.file_path) {
    selectQuery = selectQuery.eq('file_path', body.file_path);
  }

  const { data: locksToRelease } = await selectQuery;

  // Look up session provider for history logging
  let provider = 'cli';
  if (body.session_id) {
    const { data: session } = await auth.supabase
      .from('sessions')
      .select('provider')
      .eq('id', body.session_id)
      .single();
    provider = session?.provider ?? 'unknown';
  }

  // Log releases to history
  if (locksToRelease && locksToRelease.length > 0) {
    const historyEntries = locksToRelease.map(l => ({
      project_id: l.project_id,
      file_path: l.file_path,
      user_id: l.user_id,
      session_id: l.session_id,
      provider,
      action,
    }));

    await auth.supabase.from('lock_history').insert(historyEntries);
  }

  // Delete locks with exact count (RLS enforces user_id = auth.uid() OR is_org_admin())
  let deleteQuery = auth.supabase
    .from('locks')
    .delete({ count: 'exact' })
    .eq('project_id', body.project_id);

  if (!isForce && body.session_id) {
    deleteQuery = deleteQuery.eq('session_id', body.session_id);
  }

  if (body.file_path) {
    deleteQuery = deleteQuery.eq('file_path', body.file_path);
  }

  const { error, count } = await deleteQuery;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: { released: count ?? 0 } });
}
