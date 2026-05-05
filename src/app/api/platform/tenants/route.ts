import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roles } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true);
  if (!roles?.some(r => r.role === 'platform_super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = await createServiceClient();
  const { data: tenants, error } = await service
    .from('tenants').select('*').order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants });
}

export async function POST(request: NextRequest) {
  // Verify caller is platform_super_admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roles } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true);
  if (!roles?.some(r => r.role === 'platform_super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, domain, adminFullName, adminEmail } = body;
  if (!name || !slug || !adminEmail) {
    return NextResponse.json({ error: 'name, slug and adminEmail are required' }, { status: 400 });
  }

  const service = await createServiceClient();

  // Insert tenant
  const { data: tenant, error: tenantErr } = await service
    .from('tenants')
    .insert({ name, slug, domain: domain || null })
    .select()
    .single();

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 400 });

  // Resolve or create admin user
  let adminUserId: string;

  // Check if profile already exists
  const { data: existingProfile } = await service
    .from('profiles').select('id').eq('email', adminEmail).single();

  if (existingProfile) {
    adminUserId = existingProfile.id;
  } else {
    // Invite via Supabase Auth — sends an invite email
    const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(adminEmail, {
      data: { full_name: adminFullName || adminEmail },
    });
    if (inviteErr) {
      // Roll back tenant
      await service.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }
    adminUserId = invited.user.id;

    // Create profile for the new user
    await service.from('profiles').insert({
      id: adminUserId,
      email: adminEmail,
      full_name: adminFullName || adminEmail,
      tenant_id: tenant.id,
      status: 'active',
    });
  }

  // Update profile tenant_id
  await service
    .from('profiles')
    .update({ tenant_id: tenant.id })
    .eq('id', adminUserId);

  // Assign tenant_super_admin role
  const { error: roleErr } = await service.from('user_roles').insert({
    user_id: adminUserId,
    role: 'tenant_super_admin',
    tenant_id: tenant.id,
    is_active: true,
  });

  if (roleErr && !roleErr.message.includes('duplicate')) {
    return NextResponse.json({ error: roleErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, tenant }, { status: 201 });
}
