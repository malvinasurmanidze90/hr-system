import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { getTenantCompany, getTenantScopeCompanyIds } from '@/lib/tenant-server';
import type { UserRoleAssignment } from '@/types';
import { GraduationCap, BookOpen, TrendingUp, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Learning Management' };

export default async function LearningManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);

  const tenantResult = await getTenantCompany();
  if (tenantResult === 'not_found') redirect('/tenant-not-found');
  const tenantId = tenantResult ? tenantResult.id : null;
  const tenantCompanyIds = !tenantId ? await getTenantScopeCompanyIds(roles) : null;

  const applyTenant = (q: any) => {
    if (tenantId) return q.eq('company_id', tenantId);
    if (tenantCompanyIds?.length) return q.in('company_id', tenantCompanyIds);
    return q;
  };

  const [
    { count: totalCourses },
    { count: publishedCourses },
    { count: mandatoryCourses },
    { count: totalEnrollments },
  ] = await Promise.all([
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true })),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published')),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_mandatory', true)),
    applyTenant(supabase.from('course_enrollments').select('*', { count: 'exact', head: true })),
  ]);

  const isAdmin = ['platform_super_admin', 'tenant_super_admin', 'super_admin', 'hr_admin', 'ceo'].includes(primaryRole);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1.5">Learning Management</h1>
            <p className="text-indigo-200 text-sm">სასწავლო შინაარსი, კურსები და თანამშრომელთა განვითარება</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: GraduationCap, label: 'სულ კურსები',    value: totalCourses ?? 0 },
              { icon: TrendingUp,    label: 'გამოქვეყნებული', value: publishedCourses ?? 0 },
              { icon: ShieldCheck,   label: 'სავალდებულო',    value: mandatoryCourses ?? 0 },
              { icon: Users,         label: 'ჩარიცხვები',     value: totalEnrollments ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-indigo-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">მოდულები</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {/* Courses */}
          <Link href="/dashboard/learning/courses"
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-600" />
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={22} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">კურსები</p>
                  <p className="text-xs text-gray-500">კურსების ბიბლიოთეკა</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                სასწავლო კურსების შექმნა, მართვა და გამოქვეყნება. ჩარიცხეთ თანამშრომლები და თვალყური ადევნეთ პროგრესს.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {totalCourses ?? 0} კურსი
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                  გახსნა <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>

          {/* My Learning — for non-admins */}
          {['employee', 'manager', 'bu_head'].includes(primaryRole) && (
            <Link href="/dashboard/portal"
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={22} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">ჩემი სწავლა</p>
                    <p className="text-xs text-gray-500">პირადი სასწავლო პორტალი</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  თქვენი დანიშნული კურსები, პროგრესი და სერტიფიკატები.
                </p>
                <div className="flex items-center justify-end">
                  <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:gap-2 transition-all">
                    გახსნა <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Reports — for admins */}
          {isAdmin && (
            <Link href="/dashboard/reports"
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">ანგარიშები</p>
                    <p className="text-xs text-gray-500">სწავლის ანალიტიკა</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  ჩარიცხვების, დასრულების და სავალდებულო კურსების შესრულების ანგარიშები.
                </p>
                <div className="flex items-center justify-end">
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:gap-2 transition-all">
                    გახსნა <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
