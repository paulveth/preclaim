import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser, unauthorized } from '../../../../lib/auth';

const ActivityQuerySchema = z.object({
  project_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  action: z
    .enum(['acquire', 'release', 'expire', 'force_release'])
    .optional(),
});

// GET /api/v1/activity?project_id=xxx&limit=50&offset=0&action=acquire
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = ActivityQuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { project_id, limit, offset, action } = parsed.data;

  let query = auth.supabase
    .from('lock_history')
    .select(
      `
      id,
      project_id,
      file_path,
      user_id,
      session_id,
      provider,
      action,
      created_at,
      profiles!inner ( name, email, avatar_url )
    `,
    )
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) {
    query = query.eq('action', action);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
