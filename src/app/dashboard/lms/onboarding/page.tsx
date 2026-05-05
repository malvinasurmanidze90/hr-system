import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { UserCheck, Users, Calendar, ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { OnboardingActions } from './onboarding-actions';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'Onboarding' };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const canManage = canManageCourses(roles);

  const { data: programs } = await supabase
    .from('onboarding_programs')
    .select('*, onboarding_steps(count), employee_onboarding(count)')
    .eq('is_active', true)
    .order('name');

  const { data: activeOnboardings } = await supabase
    .from('employee_onboarding')
    .select('*, user:profiles(full_name, email), program:onboarding_programs(name)')
    .not('status', 'eq', 'completed')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Onboarding</h1>
              <p className="text-indigo-200 text-sm">Manage employee onboarding programs</p>
            </div>
            {canManage && <OnboardingActions />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{programs?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Programs</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{activeOnboardings?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Active Onboardings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Programs */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Programs ({programs?.length ?? 0})</h2>
            <div className="space-y-3">
              {programs?.map((prog: any) => (
                <div key={prog.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <UserCheck size={18} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{prog.name}</p>
                        {prog.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{prog.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><ClipboardList size={10} /> {prog.onboarding_steps?.[0]?.count ?? 0} steps</span>
                          <span>{prog.duration_days} days</span>
                          <span className="flex items-center gap-1"><Users size={10} /> {prog.employee_onboarding?.[0]?.count ?? 0} enrolled</span>
                          {prog.target_role && <Badge variant="indigo">{prog.target_role}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!programs || programs.length === 0) && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <UserCheck size={20} className="text-indigo-300" />
                  </div>
                  <p className="text-sm text-gray-400">No programs yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Onboardings */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Onboardings ({activeOnboardings?.length ?? 0})</h2>
            <div className="space-y-3">
              {activeOnboardings?.map((ob: any) => (
                <div key={ob.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {(ob.user?.full_name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{ob.user?.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{ob.program?.name}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Calendar size={10} />
                          <span>Started {formatDate(ob.start_date)}</span>
                          {ob.expected_end_date && <span>· Due {formatDate(ob.expected_end_date)}</span>}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={ob.status} />
                  </div>
                </div>
              ))}
              {(!activeOnboardings || activeOnboardings.length === 0) && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <Users size={20} className="text-indigo-300" />
                  </div>
                  <p className="text-sm text-gray-400">No active onboardings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
