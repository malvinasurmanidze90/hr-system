import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { GraduationCap, Users, UserCheck, TrendingUp, BookOpen, Clock, Award, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'Dashboard' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'დილა მშვიდობისა';
  if (h < 17) return 'შუადღე მშვიდობისა';
  return 'საღამო მშვიდობისა';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(id,name)')
    .eq('id', user.id)
    .single();

  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);
  const companyId   = profile?.company_id;
  const isEmployee  = primaryRole === 'employee';
  const firstName   = profile?.full_name?.split(' ')[0] ?? 'User';

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalEnrollments },
    { count: completedEnrollments },
    { data: recentEnrollments },
    { data: myEnrollments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', companyId ?? ''),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('company_id', companyId ?? ''),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('course_enrollments')
      .select('*, course:courses(title), user:profiles(full_name)')
      .order('enrolled_at', { ascending: false })
      .limit(5),
    supabase.from('course_enrollments')
      .select('*, course:courses(title, estimated_duration_minutes)')
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(5),
  ]);

  const completionRate = totalEnrollments
    ? Math.round(((completedEnrollments ?? 0) / totalEnrollments) * 100)
    : 0;

  const today = new Date().toLocaleDateString('ka-GE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const adminStats = [
    { icon: Users,        label: 'თანამშრომელი', value: totalUsers ?? 0,        sub: 'სულ' },
    { icon: GraduationCap,label: 'კურსი',         value: totalCourses ?? 0,      sub: 'სულ' },
    { icon: BookOpen,     label: 'ჩარიცხვა',      value: totalEnrollments ?? 0,  sub: 'სულ' },
    { icon: TrendingUp,   label: 'დასრულება',      value: `${completionRate}%`,  sub: 'მაჩვ.' },
  ];

  const employeeStats = [
    { icon: GraduationCap, label: 'ჩემი კურსები',  value: myEnrollments?.length ?? 0 },
    { icon: UserCheck,     label: 'დასრულებული',    value: myEnrollments?.filter((e: any) => e.status === 'completed').length ?? 0 },
    { icon: Clock,         label: 'მიმდინარე',      value: myEnrollments?.filter((e: any) => e.status === 'in_progress').length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Gradient hero ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">

          {/* Welcome */}
          <div className="mb-8">
            <p className="text-indigo-300 text-sm font-medium mb-1">{today}</p>
            <h1 className="text-2xl font-bold text-white">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {isEmployee ? 'გახსენი სასწავლო პლატფორმა და განაახლე ცოდნა.' : 'HR OS — სრული სურათი ერთ ადგილას.'}
            </p>
          </div>

          {/* Stats glass cards */}
          <div className={`grid gap-3 ${isEmployee ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {(isEmployee ? employeeStats : adminStats).map(({ icon: Icon, label, value, sub }: any) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm font-medium text-indigo-100 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-indigo-300 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* My Learning */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <GraduationCap size={14} className="text-indigo-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">ჩემი სწავლა</h3>
              </div>
              <Link href="/dashboard/courses"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                ყველა <ArrowRight size={12} />
              </Link>
            </div>
            {myEnrollments && myEnrollments.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {myEnrollments.map((e: any) => (
                  <li key={e.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.course?.title}</p>
                      <p className="text-xs text-gray-400">
                        {e.course?.estimated_duration_minutes}წთ
                        {e.due_date && ` · ვადა ${formatDate(e.due_date)}`}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={20} className="text-indigo-300" />
                </div>
                <p className="text-sm text-gray-500">კურსები ჯერ არ არის.</p>
              </div>
            )}
          </div>

          {/* Recent Enrollments (admin) or Achievement card (employee) */}
          {!isEmployee ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Users size={14} className="text-violet-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">ბოლო ჩარიცხვები</h3>
                </div>
              </div>
              {recentEnrollments && recentEnrollments.length > 0 ? (
                <ul className="divide-y divide-gray-50">
                  {recentEnrollments.map((e: any) => (
                    <li key={e.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 text-xs font-bold">
                        {(e.user?.full_name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.user?.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{e.course?.title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <StatusBadge status={e.status} />
                        <p className="text-xs text-gray-400 mt-1">{formatDate(e.enrolled_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-400">ჩარიცხვები არ არის.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <Award size={26} className="text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-amber-900 mb-1">განაახლე ცოდნა</h3>
              <p className="text-sm text-amber-700 mb-4 leading-relaxed">
                სავალდებულო კურსების გავლა გეხმარება კარიერულ განვითარებაში.
              </p>
              <Link href="/dashboard/courses"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-sm hover:shadow-md transition-all">
                კურსების ნახვა <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
