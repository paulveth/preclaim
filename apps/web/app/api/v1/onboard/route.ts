import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized } from '../../../../lib/auth';
import { OnboardRequestSchema } from '../../../../lib/schemas';

// POST /api/v1/onboard — Create org + project for a new user
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized();

  const parsed = OnboardRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Check if user already has a profile with an org
  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('id, org_id, email')
    .eq('id', auth.user.id)
    .single();

  let orgId = profile?.org_id;

  // If no org, create one based on user email
  if (!orgId) {
    const slug = auth.user.email?.split('@')[0] ?? auth.user.id.slice(0, 8);
    const name = auth.user.user_metadata?.full_name ?? auth.user.email ?? 'My Organization';

    const { data: org, error: orgErr } = await auth.supabase
      .from('organizations')
      .insert({ name, slug: `${slug}-${Date.now().toString(36)}` })
      .select()
      .single();

    if (orgErr) {
      return Response.json({ error: `Failed to create organization: ${orgErr.message}` }, { status: 500 });
    }

    orgId = org.id;

    // Link profile to org as admin
    await auth.supabase
      .from('profiles')
      .update({ org_id: orgId, role: 'admin' })
      .eq('id', auth.user.id);
  }

  // Check if project with this slug already exists for this org
  const { data: existing } = await auth.supabase
    .from('projects')
    .select('id')
    .eq('org_id', orgId)
    .eq('slug', body.project_slug)
    .single();

  if (existing) {
    return Response.json({
      data: {
        project_id: existing.id,
        org_id: orgId,
        already_existed: true,
      },
    });
  }

  // Create project
  const { data: project, error: projErr } = await auth.supabase
    .from('projects')
    .insert({
      org_id: orgId,
      name: body.project_name,
      slug: body.project_slug,
    })
    .select()
    .single();

  if (projErr) {
    return Response.json({ error: `Failed to create project: ${projErr.message}` }, { status: 500 });
  }

  return Response.json({
    data: {
      project_id: project.id,
      org_id: orgId,
      already_existed: false,
    },
  }, { status: 201 });
}
