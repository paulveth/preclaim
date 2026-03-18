import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser, unauthorized } from '../../../../../lib/auth';

const ForceReleaseSchema = z.object({
  lock_id: z.string().uuid(),
});

// POST /api/v1/locks/force-release — Admin-only force release of a lock
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = ForceReleaseSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { lock_id } = parsed.data;

  // Verify caller is admin
  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  // Fetch the lock (RLS ensures org scoping)
  const { data: lock, error: lockError } = await auth.supabase
    .from('locks')
    .select('*')
    .eq('id', lock_id)
    .single();

  if (lockError || !lock) {
    return Response.json({ error: 'Lock not found' }, { status: 404 });
  }

  // Log force release to history first
  const { error: historyError } = await auth.supabase
    .from('lock_history')
    .insert({
      project_id: lock.project_id,
      file_path: lock.file_path,
      user_id: lock.user_id,
      session_id: lock.session_id,
      provider: 'dashboard',
      action: 'force_release' as const,
    });

  if (historyError) {
    return Response.json({ error: historyError.message }, { status: 500 });
  }

  // Delete the lock
  const { error: deleteError } = await auth.supabase
    .from('locks')
    .delete()
    .eq('id', lock_id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ data: { released: lock_id } });
}
