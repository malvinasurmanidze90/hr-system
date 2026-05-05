import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canViewReports } from '@/lib/auth/permissions';
import { getTenantCompany, getTenantScopeCompanyIds } from '@/lib/tenant-server';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Users, GraduationCap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canViewReports(roles)) redirect('/dashboard');

  const tenantResult = await getTenantCompany();
  const cid = tenantResult && tenantResult !== 'not_found' ? tenantResult.id : null;
  const tenantCompanyIds = !cid ? await getTenantScopeCompanyIds(roles) : null;

  const applyTenant = (q: any) => {
    if (cid) return q.eq('company_id', cid);
    if (tenantCompanyIds?.length) return q.in('company_id', tenantCompanyIds);
    return q;
  };

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalEnrollments },
    { count: completedEnrollments },
    { count: overdueEnrollments },
    { data: recentCompletions },
    { data: courseStats },
  ] = await Promise.all([
    applyTenant(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active')),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published')),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('course_enrollments')
      .select('*, user:profiles(full_name), course:courses(title)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10),
    applyTenant(supabase.from('courses').select('id, title, course_enrollments(status)').eq('status', 'published').limit(10)),
  ]);

  const completionRate = totalEnrollments
    ? Math.round(((completedEnrollments ?? 0) / totalEnrollments) * 100)
    : 0;

  const courseStatsFormatted = courseStats?.map((c: any) => {
    const enrolls: any[] = c.course_enrollments ?? [];
    const total = enrolls.length;
    const done  = enrolls.filter((e: any) => e.status === 'completed').length;
    return { title: c.title, total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }) ?? [];

  const summaryStats = [
    { icon: Users,         label: 'Active Employees',   value: totalUsers ?? 0,        color: 'from-indigo-500 to-indigo-600' },
    { icon: GraduationCap, label: 'Published Courses',  value: totalCourses ?? 0,      color: 'from-violet-500 to-violet-600' },
    { icon: TrendingUp,    label: 'Completion Rate',    value: `${completionRate}%`,   color: 'from-emerald-500 to-emerald-600' },
    { icon: AlertTriangle, label: 'Overdue',            value: overdueEnrollments ?? 0, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Reports & Analytics</h1>
            <p className="text-indigo-200 text-sm">Learning and onboarding performance data</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryStats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-sm`}>
                  <Icon size={17} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-indigo-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Enrollment breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                <BarChart3 size={14} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Enrollment Overview</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Completed',   value: completedEnrollments ?? 0, color: 'emerald' as const },
                { label: 'In Progress', value: Math.max(0, (totalEnrollments ?? 0) - (completedEnrollments ?? 0) - (overdueEnrollments ?? 0)), color: 'indigo' as const },
                { label: 'Overdue',     value: overdueEnrollments ?? 0,   color: 'rose' as const },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-semibold text-gray-900">
                      {item.value}
                      <span className="text-gray-400 font-normal"> / {totalEnrollments ?? 0}</span>
                    </span>
                  </div>
                  <Progress value={item.value} max={Math.max(totalEnrollments ?? 1, 1)} color={item.color} size="md" />
                </div>
              ))}
            </div>
          </div>

          {/* Course completion rates */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <GraduationCap size={14} className="text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Course Completion Rates</h3>
            </div>
            <div className="space-y-4">
              {courseStatsFormatted.map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 truncate max-w-[60%] font-medium">{c.title}</span>
                    <span className="font-bold text-gray-900">{c.rate}%</span>
                  </div>
                  <Progress value={c.rate} size="sm" />
                  <p className="text-xs text-gray-400 mt-1">{c.done} / {c.total} completed</p>
                </div>
              ))}
              {courseStatsFormatted.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No course data available.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent completions table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Recent Completions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Employee', 'Course', 'Completed', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentCompletions?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {getInitials(e.user?.full_name ?? 'U')}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{e.user?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{e.course?.title}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">{formatDate(e.completed_at)}</td>
                    <td className="px-5 py-4"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
                {(!recentCompletions || recentCompletions.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                      No completions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
