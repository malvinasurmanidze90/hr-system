import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function guardPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: roles } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true);
  if (!roles?.some(r => r.role === 'platform_super_admin'))
    return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200 };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const guard = await guardPlatformAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { email, fullName } = await request.json();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const service = await createServiceClient();

  // Find existing profile by email
  const { data: existingProfile } = await service
    .from('profiles').select('id').eq('email', email).single();

  let adminUserId: string;

  if (existingProfile) {
    adminUserId = existingProfile.id;
  } else {
    const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || email },
    });
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    adminUserId = invited.user.id;

    await service.from('profiles').insert({
      id: adminUserId,
      email,
      full_name: fullName || email,
      tenant_id: tenantId,
      status: 'active',
    });
  }

  // Update profile tenant_id
  await service.from('profiles').update({ tenant_id: tenantId }).eq('id', adminUserId);

  // Deactivate any existing tenant_super_admin role for this user on this tenant
  await service.from('user_roles')
    .update({ is_active: false })
    .eq('user_id', adminUserId)
    .eq('role', 'tenant_super_admin')
    .eq('tenant_id', tenantId);

  // Insert fresh active role
  const { error: roleErr } = await service.from('user_roles').insert({
    user_id: adminUserId,
    role: 'tenant_super_admin',
    tenant_id: tenantId,
    is_active: true,
  });

  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const guard = await guardPlatformAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const service = await createServiceClient();
  const { error } = await service.from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('role', 'tenant_super_admin')
    .eq('tenant_id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
