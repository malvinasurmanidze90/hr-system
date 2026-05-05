import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { Building, Users, Calendar, Globe } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CompanyActions } from './company-actions';
import { getTenantCompany } from '@/lib/tenant-server';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'Companies' };

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (getPrimaryRole(roles) !== 'super_admin') redirect('/dashboard');

  const tenant = await getTenantCompany();
  if (tenant === 'not_found') redirect('/tenant-not-found');

  // On subdomain: show only that company. On main domain: show all.
  let companiesQuery = supabase.from('companies').select('*').order('name');
  if (tenant) companiesQuery = companiesQuery.eq('id', tenant.id);

  const { data: companies } = await companiesQuery;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Companies</h1>
              <p className="text-indigo-200 text-sm">
                {tenant ? `Viewing: ${tenant.name}` : 'Manage all organizations in the system'}
              </p>
            </div>
            {!tenant && <CompanyActions />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{companies?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Total Companies</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{companies?.filter((c: any) => c.is_active).length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {(!companies || companies.length === 0) ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <Building size={24} className="text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No companies yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {companies.map((company: any) => (
              <div key={company.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-600" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Building size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{company.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Globe size={10} />{company.industry ?? 'No industry'}
                      </p>
                      {company.slug && (
                        <p className="text-xs font-mono text-indigo-400 mt-0.5">{company.slug}.hrapp.org</p>
                      )}
                    </div>
                    <StatusBadge status={company.is_active ? 'active' : 'archived'} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-indigo-400" />{company.size_range ?? 'Unknown size'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-indigo-400" />{formatDate(company.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
