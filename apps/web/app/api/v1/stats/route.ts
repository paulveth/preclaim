import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser, unauthorized } from '../../../../lib/auth';

const StatsQuerySchema = z.object({
  project_id: z.string().uuid(),
});

// GET /api/v1/stats?project_id=xxx
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = StatsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { project_id } = parsed.data;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [locksResult, sessionsResult, interestsResult, conflictsResult, filesResult] =
    await Promise.all([
      // Active locks count
      auth.supabase
        .from('locks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id),
      // Active sessions count
      auth.supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id),
      // Active file interests count
      auth.supabase
        .from('file_interests')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .gt('expires_at', new Date().toISOString()),
      // Conflicts today (lock_history where action would show conflict — we track acquire/release,
      // conflicts are tracked as separate entries in lock_history with action context)
      auth.supabase
        .from('lock_history')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id)
        .gte('created_at', todayISO),
      // Unique files coordinated today
      auth.supabase
        .from('lock_history')
        .select('file_path')
        .eq('project_id', project_id)
        .eq('action', 'acquire')
        .gte('created_at', todayISO),
    ]);

  const uniqueFiles = filesResult.data
    ? new Set(filesResult.data.map((r) => r.file_path)).size
    : 0;

  return Response.json({
    data: {
      active_locks: locksResult.count ?? 0,
      active_sessions: sessionsResult.count ?? 0,
      active_interests: interestsResult.count ?? 0,
      activity_today: conflictsResult.count ?? 0,
      files_today: uniqueFiles,
    },
  });
}
