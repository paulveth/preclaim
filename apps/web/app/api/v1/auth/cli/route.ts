import { NextRequest } from 'next/server';
import { createAdminSupabase } from '../../../../../lib/supabase';

// POST /api/v1/auth/cli — Exchange auth code for tokens (CLI login flow)
export async function POST(req: NextRequest) {
  const body = await req.json() as { code: string; redirect_uri: string };

  const supabase = createAdminSupabase();

  const { data, error } = await supabase.auth.exchangeCodeForSession(body.code);

  if (error || !data.session) {
    return Response.json({ error: error?.message ?? 'Failed to exchange code' }, { status: 401 });
  }

  // Get user profile for org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', data.session.user.id)
    .single() as { data: { org_id: string | null } | null };

  return Response.json({
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: new Date(data.session.expires_at! * 1000).toISOString(),
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        org_id: profile?.org_id ?? null,
      },
    },
  });
}
