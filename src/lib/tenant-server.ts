import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { UserRoleAssignment } from '@/types';

export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tenant_id: string | null;
}

/**
 * Returns the list of enabled module keys for a given tenant.
 * Returns an empty array if tenantId is null (main domain with no tenant context).
 */
export async function getEnabledModules(tenantId: string | null): Promise<string[]> {
  if (!tenantId) return [];
  // Service client: tenantId is already trusted (resolved from user's role/company/subdomain)
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('tenant_id', tenantId)
    .eq('is_enabled', true);
  return data?.map(r => r.module_key) ?? [];
}

/**
 * Returns the company IDs that belong to a tenant_super_admin's tenant.
 * Used to scope data on the main domain when there's no subdomain header.
 * Returns null if the user is not a tenant_super_admin or has no tenant_id.
 */
export async function getTenantScopeCompanyIds(
  roles: UserRoleAssignment[]
): Promise<string[] | null> {
  const tenantRole = roles.find(r => r.role === 'tenant_super_admin' && r.is_active && r.tenant_id);
  if (!tenantRole?.tenant_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('tenant_id', tenantRole.tenant_id)
    .eq('is_active', true);

  return data?.map(c => c.id) ?? [];
}

/**
 * Resolves the current tenant company from the x-tenant-slug header
 * injected by middleware. Uses React cache() so the DB query is only
 * executed once per request, no matter how many server components call it.
 *
 * Returns null when accessed from the main domain (hrapp.org / localhost).
 * Returns the company when on a valid tenant subdomain.
 * Throws if the slug exists but no active company matches — caller should redirect.
 */
export const getTenantCompany = cache(async (): Promise<TenantCompany | null | 'not_found'> => {
  const h = await headers();
  const slug = h.get('x-tenant-slug');
  if (!slug) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url, tenant_id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!data) return 'not_found';
  return data as TenantCompany;
});
