import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../../lib/auth';
import { BatchCheckRequestSchema } from '../../../../../lib/schemas';

// POST /api/v1/locks/check — Batch check file locks
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = BatchCheckRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data, error } = await auth.supabase
    .from('locks')
    .select('*')
    .eq('project_id', body.project_id)
    .in('file_path', body.file_paths);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Build lookup map: file_path -> lock or null
  const locks: Record<string, typeof data[0] | null> = {};
  for (const fp of body.file_paths) {
    locks[fp] = data.find(l => l.file_path === fp) ?? null;
  }

  return Response.json({ data: { locks } });
}
