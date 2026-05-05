import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole, canManageUsers, ROLE_LABELS } from '@/lib/auth/permissions';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import { UserActions } from './user-actions';
import { getTenantCompany, getTenantScopeCompanyIds } from '@/lib/tenant-server';
import type { UserRoleAssignment, UserRole } from '@/types';

export const metadata = { title: 'Users' };

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageUsers(roles)) redirect('/dashboard');

  // Tenant scoping: subdomain takes priority, then role-based for tenant_super_admin
  const tenant = await getTenantCompany();
  if (tenant === 'not_found') redirect('/tenant-not-found');
  const tenantCompanyIds = !tenant ? await getTenantScopeCompanyIds(roles) : null;

  let profilesQuery = supabase.from('profiles').select('*, user_roles(*)').order('full_name');
  if (tenant) profilesQuery = profilesQuery.eq('company_id', tenant.id);
  else if (tenantCompanyIds?.length) profilesQuery = profilesQuery.in('company_id', tenantCompanyIds);

  const { data: profiles } = await profilesQuery;

  let companiesQuery = supabase.from('companies').select('id, name');
  if (tenant) companiesQuery = companiesQuery.eq('id', tenant.id);
  else if (tenantCompanyIds?.length) companiesQuery = companiesQuery.in('id', tenantCompanyIds);
  const { data: companies } = await companiesQuery;

  let buQuery = supabase.from('business_units').select('id, name, company_id');
  if (tenant) buQuery = buQuery.eq('company_id', tenant.id);
  else if (tenantCompanyIds?.length) buQuery = buQuery.in('company_id', tenantCompanyIds);
  const { data: businessUnits } = await buQuery;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Users & Employees</h1>
              <p className="text-indigo-200 text-sm">
                {tenant ? `${tenant.name} · ` : ''}Manage team members, roles, and access
              </p>
            </div>
            <UserActions companies={companies ?? []} businessUnits={businessUnits ?? []} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Users',  value: profiles?.length ?? 0 },
              { label: 'Active',       value: profiles?.filter((p: any) => p.status === 'active').length ?? 0 },
              { label: 'Roles',        value: new Set(profiles?.flatMap((p: any) => (p.user_roles ?? []).map((r: any) => r.role))).size },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-indigo-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['Employee', 'Role', 'Department', 'Hired', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles?.map((p: any) => {
                  const userRoles: UserRoleAssignment[] = p.user_roles ?? [];
                  const pRole = getPrimaryRole(userRoles);
                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                            {getInitials(p.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="indigo">{ROLE_LABELS[pRole]}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{p.department ?? '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">{formatDate(p.hire_date)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(!profiles || profiles.length === 0) && (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                  <Users size={24} className="text-indigo-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No users yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
