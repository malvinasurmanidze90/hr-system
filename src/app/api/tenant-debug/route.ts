import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantSlug } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') ?? 'unknown';
  const tenantSlug = getTenantSlug(hostname);

  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, slug, is_active')
    .order('name');

  return NextResponse.json({
    hostname,
    tenantSlug,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    companiesCount: companies?.length ?? 0,
    companies: companies ?? [],
    error: error ? error.message : null,
  });
}
