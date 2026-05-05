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

  const service = await createServiceClient();
  const body = await request.json();
  const { action, companyId, name, slug, industry, size_range } = body;

  if (action === 'link') {
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const { error } = await service
      .from('companies').update({ tenant_id: tenantId }).eq('id', companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'unlink') {
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const { error } = await service
      .from('companies').update({ tenant_id: null }).eq('id', companyId).eq('tenant_id', tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'create') {
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const { data, error } = await service
      .from('companies')
      .insert({ name, slug: slug || null, industry: industry || null, size_range: size_range || null, tenant_id: tenantId })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ company: data }, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
