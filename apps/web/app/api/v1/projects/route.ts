import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser, unauthorized } from '../../../../lib/auth';

const UpdateProjectSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  default_ttl: z.number().int().min(1).max(1440).optional(),
});

// PATCH /api/v1/projects — Update project settings
export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = UpdateProjectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { project_id, ...updates } = parsed.data;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Verify admin role
  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from('projects')
    .update(updates)
    .eq('id', project_id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
