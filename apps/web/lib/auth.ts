import { NextRequest } from 'next/server';
import { createServerSupabase } from './supabase';

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = createServerSupabase(token);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  return { user, supabase, token };
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
