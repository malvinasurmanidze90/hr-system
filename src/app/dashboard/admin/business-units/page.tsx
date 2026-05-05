import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageCompany } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { BusinessUnitActions } from './bu-actions';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'Business Units' };

export default async function BusinessUnitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageCompany(roles)) redirect('/dashboard');

  const { data: companies }     = await supabase.from('companies').select('id, name').order('name');
  const { data: businessUnits } = await supabase
    .from('business_units')
    .select('*, company:companies(name)')
    .order('name');

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Business Units</h1>
              <p className="text-indigo-200 text-sm">Manage departments and business objects</p>
            </div>
            <BusinessUnitActions companies={companies ?? []} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{businessUnits?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Total Units</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{businessUnits?.filter((b: any) => b.is_active).length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {(!businessUnits || businessUnits.length === 0) ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <Building2 size={24} className="text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No business units yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {businessUnits.map((bu: any) => (
              <div key={bu.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                {/* Top accent strip */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{bu.name}</p>
                      {bu.code && <p className="text-xs font-mono text-gray-400 mt-0.5">{bu.code}</p>}
                    </div>
                    <StatusBadge status={bu.is_active ? 'active' : 'archived'} />
                  </div>

                  {bu.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">{bu.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-indigo-400" />{bu.company?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-indigo-400" />{formatDate(bu.created_at)}
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
