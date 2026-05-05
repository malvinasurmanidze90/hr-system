import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { canManageTenants } from '@/lib/auth/permissions';
import type { UserRoleAssignment } from '@/types';

export const KNOWN_MODULES = [
  {
    key: 'learning_management',
    label: 'Learning Management',
    description: 'Courses, enrollments, and employee learning paths',
  },
] as const;

async function getAuthedAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageTenants(roles)) return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const supabase = await createClient();
  if (!await getAuthedAdmin(supabase)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: existing } = await service
    .from('tenant_modules')
    .select('module_key, is_enabled')
    .eq('tenant_id', tenantId);

  const moduleMap: Record<string, boolean> = {};
  for (const row of existing ?? []) moduleMap[row.module_key] = row.is_enabled;

  const modules = KNOWN_MODULES.map(m => ({
    ...m,
    is_enabled: moduleMap[m.key] ?? false,
  }));

  return NextResponse.json({ modules });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const supabase = await createClient();
  if (!await getAuthedAdmin(supabase)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { module_key, is_enabled } = await req.json() as { module_key: string; is_enabled: boolean };
  if (!module_key || typeof is_enabled !== 'boolean') {
    return NextResponse.json({ error: 'module_key and is_enabled required' }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from('tenant_modules')
    .upsert(
      { tenant_id: tenantId, module_key, is_enabled, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,module_key' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
