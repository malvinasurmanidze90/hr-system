import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import type { UserRoleAssignment } from '@/types';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const resource_type = searchParams.get('resource_type');

  let query = supabase
    .from('audit_logs')
    .select('*, user:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (resource_type) query = query.eq('resource_type', resource_type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
