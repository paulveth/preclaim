import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import { RegisterInterestSchema, CheckInterestsSchema } from '../../../../lib/schemas';

// POST /api/v1/interests — Register a file interest (soft signal)
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = RegisterInterestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { error } = await auth.supabase.rpc('register_file_interest', {
    p_project_id: body.project_id,
    p_file_path: body.file_path,
    p_session_id: body.session_id,
    p_user_id: auth.user.id,
    p_ttl_seconds: 60,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: null }, { status: 201 });
}

// GET /api/v1/interests?project_id=&file_path=&exclude_session_id= — Check active interests
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = CheckInterestsSchema.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { project_id, file_path, exclude_session_id } = parsed.data;

  const { data, error } = await auth.supabase
    .from('file_interests')
    .select('*')
    .eq('project_id', project_id)
    .eq('file_path', file_path)
    .neq('session_id', exclude_session_id)
    .gt('expires_at', new Date().toISOString());

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: { interests: data ?? [] } });
}
