import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPrimaryRole, canManageUsers } from '@/lib/auth/permissions';
import { auditLog } from '@/lib/audit';
import type { UserRole, UserRoleAssignment } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageUsers(roles)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, password, full_name, role, company_id, business_unit_id, position, department } = body;

  const serviceClient = await createServiceClient();

  // Create auth user
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Update profile
  await serviceClient.from('profiles').update({
    full_name, company_id, position, department,
  }).eq('id', authUser.user.id);

  // Assign role
  await serviceClient.from('user_roles').insert({
    user_id: authUser.user.id,
    role: role as UserRole,
    company_id,
    business_unit_id: business_unit_id || null,
    assigned_by: user.id,
  });

  // Add to BU if specified
  if (business_unit_id) {
    await serviceClient.from('user_business_units').insert({
      user_id: authUser.user.id,
      business_unit_id,
    });
  }

  await auditLog({
    action: 'CREATE',
    resource_type: 'user',
    resource_id: authUser.user.id,
    new_data: { email, full_name, role, company_id },
    company_id,
  });

  return NextResponse.json({ id: authUser.user.id });
}
