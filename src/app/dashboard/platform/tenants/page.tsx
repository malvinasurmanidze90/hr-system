import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageTenants } from '@/lib/auth/permissions';
import { Building2, Globe, Calendar, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CreateTenantButton } from './tenant-actions';
import type { UserRoleAssignment, Tenant } from '@/types';

export const metadata = { title: 'Tenants' };

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageTenants(roles)) redirect('/dashboard');

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, companies(count)')
    .order('created_at', { ascending: false });

  const allTenants = (tenants ?? []) as (Tenant & { companies: { count: number }[] })[];
  const activeTenants = allTenants.filter(t => t.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Layers size={15} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
              </div>
              <p className="text-indigo-200 text-sm">Manage platform tenants and their administrators</p>
            </div>
            <div className="flex-shrink-0">
              <CreateTenantButton />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Total Tenants',  value: allTenants.length },
              { label: 'Active',         value: activeTenants },
              { label: 'Inactive',       value: allTenants.length - activeTenants },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-indigo-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {allTenants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-24 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Layers size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No tenants yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Create your first tenant to start onboarding client organizations.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Tenant', 'Slug / Domain', 'Companies', 'Status', 'Created'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allTenants.map(tenant => {
                    const companyCount = tenant.companies?.[0]?.count ?? 0;
                    return (
                      <tr key={tenant.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Building2 size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{tenant.name}</p>
                              <p className="text-xs text-gray-400">ID: {tenant.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="font-mono text-xs text-indigo-600 flex items-center gap-1">
                              <Globe size={11} />{tenant.slug}.hrapp.org
                            </p>
                            {tenant.domain && (
                              <p className="text-xs text-gray-400">{tenant.domain}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Building2 size={10} />{companyCount}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {tenant.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle2 size={11} />Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              <XCircle size={11} />Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Calendar size={12} className="text-indigo-400" />
                            {formatDate(tenant.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{allTenants.length} tenant{allTenants.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
