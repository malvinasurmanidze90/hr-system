import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { TenantProvider, type TenantData } from '@/lib/tenant-context';
import { getTenantCompany } from '@/lib/tenant-server';
import type { UserRoleAssignment } from '@/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant (null = main domain, 'not_found' = invalid slug)
  const tenantResult = await getTenantCompany();
  if (tenantResult === 'not_found') redirect('/tenant-not-found');

  const tenantData: TenantData = tenantResult
    ? {
        tenantSlug: tenantResult.slug,
        companyId: tenantResult.id,
        companyName: tenantResult.name,
        logoUrl: tenantResult.logo_url,
      }
    : { tenantSlug: null, companyId: null, companyName: null, logoUrl: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(name)')
    .eq('id', user.id)
    .single();

  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);

  // Prefer tenant company name when on a subdomain
  const companyName =
    tenantData.companyName ?? (profile?.company as { name?: string } | null)?.name;

  return (
    <TenantProvider value={tenantData}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar
          userName={profile?.full_name ?? user.email ?? 'User'}
          userEmail={user.email ?? ''}
          primaryRole={primaryRole}
          companyName={companyName}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  );
}
