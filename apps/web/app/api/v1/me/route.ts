import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';

// GET /api/v1/me — Return current user profile + org
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('id, email, name, avatar_url, org_id, role')
    .eq('id', auth.user.id)
    .single();

  if (profileError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  let org: { id: string; name: string; slug: string } | null = null;
  if (profile.org_id) {
    const { data: orgData } = await auth.supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', profile.org_id)
      .single();

    org = orgData ?? null;
  }

  return Response.json({
    data: {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
      org,
    },
  });
}
