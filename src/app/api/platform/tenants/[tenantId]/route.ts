import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function guardPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401, supabase: null };
  const { data: roles } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true);
  if (!roles?.some(r => r.role === 'platform_super_admin'))
    return { error: 'Forbidden', status: 403, supabase: null };
  return { error: null, status: 200, supabase };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const guard = await guardPlatformAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const [
    { data: tenant },
    { data: admins },
    { data: companies },
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    supabase.from('user_roles')
      .select('*, profile:profiles(id, full_name, email, status)')
      .eq('role', 'tenant_super_admin')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase.from('companies').select('*').eq('tenant_id', tenantId).order('name'),
  ]);

  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ tenant, admins: admins ?? [], companies: companies ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const guard = await guardPlatformAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const body = await request.json();
  const { name, slug, domain, is_active } = body;

  // Validate slug uniqueness
  if (slug) {
    const { data: existing } = await supabase
      .from('tenants').select('id').eq('slug', slug).neq('id', tenantId).single();
    if (existing) {
      return NextResponse.json({ error: 'Slug is already taken by another tenant' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined)      updates.name      = name;
  if (slug !== undefined)      updates.slug      = slug;
  if (domain !== undefined)    updates.domain    = domain || null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('tenants').update(updates).eq('id', tenantId).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tenant: data });
}
