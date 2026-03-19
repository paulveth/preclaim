import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import { SessionRegisterRequestSchema, SessionDeleteRequestSchema } from '../../../../lib/schemas';

// GET /api/v1/sessions?project_id=xxx — List active sessions
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('sessions')
    .select(`
      *,
      profiles!inner ( name, email, avatar_url )
    `)
    .eq('project_id', projectId)
    .order('last_heartbeat', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

// POST /api/v1/sessions — Register a new session
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = SessionRegisterRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { error } = await auth.supabase
    .from('sessions')
    .upsert({
      id: body.session_id,
      user_id: auth.user.id,
      project_id: body.project_id,
      provider: body.provider ?? 'claude-code',
      last_heartbeat: new Date().toISOString(),
      metadata: body.metadata ?? {},
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: { session_id: body.session_id } }, { status: 201 });
}

// DELETE /api/v1/sessions — End session and release all locks
export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = SessionDeleteRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Verify session ownership (defense in depth, RLS is the vangnet)
  const { data: session } = await auth.supabase
    .from('sessions')
    .select('user_id')
    .eq('id', body.session_id)
    .single();

  if (!session || session.user_id !== auth.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Release all locks for this session (with history logging)
  const { data: locks } = await auth.supabase
    .from('locks')
    .select('*')
    .eq('session_id', body.session_id);

  if (locks && locks.length > 0) {
    const historyEntries = locks.map(l => ({
      project_id: l.project_id,
      file_path: l.file_path,
      user_id: l.user_id,
      session_id: l.session_id,
      provider: 'claude-code',
      action: 'release' as const,
    }));

    const { error: historyError } = await auth.supabase.from('lock_history').insert(historyEntries);
    if (historyError) {
      return Response.json({ error: historyError.message }, { status: 500 });
    }

    const { error: deleteLocksError } = await auth.supabase
      .from('locks')
      .delete()
      .eq('session_id', body.session_id);

    if (deleteLocksError) {
      return Response.json({ error: deleteLocksError.message }, { status: 500 });
    }
  }

  // Cleanup file interests for this session
  await auth.supabase
    .from('file_interests')
    .delete()
    .eq('session_id', body.session_id);

  // Delete session
  const { error: deleteSessionError } = await auth.supabase
    .from('sessions')
    .delete()
    .eq('id', body.session_id)
    .eq('user_id', auth.user.id);

  if (deleteSessionError) {
    return Response.json({ error: deleteSessionError.message }, { status: 500 });
  }

  return Response.json({ data: { released: locks?.length ?? 0 } });
}
