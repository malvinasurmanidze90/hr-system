import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/badge';
import { CoursesToolbar } from './courses-toolbar';
import { CreateCourseButton } from './course-form';
import { CourseCardActions } from './course-card-actions';
import { getTenantCompany, getTenantScopeCompanyIds } from '@/lib/tenant-server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import type { UserRoleAssignment } from '@/types';
import {
  GraduationCap, Clock, Calendar, BookOpen,
  ShieldCheck, TrendingUp, FileText, Users, AlertCircle,
} from 'lucide-react';
import { formatDuration, formatDate } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜áƒ¡ áƒ‘áƒ˜áƒ‘áƒšáƒ˜áƒáƒ—áƒ”áƒ™áƒ' };

/* gradient per status */
const STATUS_GRAD: Record<string, string> = {
  published: 'from-indigo-500 via-violet-500 to-purple-600',
  draft:     'from-slate-400 to-slate-500',
  archived:  'from-rose-400 to-rose-600',
};

interface Props {
  searchParams: Promise<{ q?: string; status?: string; cat?: string; mandatory?: string; view?: string }>;
}

export default async function CoursesLibraryPage({ searchParams }: Props) {
  const { q, status, cat, mandatory, view } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);

  const tenantResult = await getTenantCompany();
  const tenantId = tenantResult && tenantResult !== 'not_found' ? tenantResult.id : null;
  const tenantCompanyIds = !tenantId ? await getTenantScopeCompanyIds(roles) : null;

  // Resolve active company for course creation context
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  const activeCompanyId = tenantId ?? profile?.company_id ?? null;

  const applyTenant = (q: any) => {
    if (tenantId) return q.eq('company_id', tenantId);
    if (tenantCompanyIds?.length) return q.in('company_id', tenantCompanyIds);
    return q;
  };

  /* parallel: counts + categories */
  const [
    { count: totalCount },
    { count: publishedCount },
    { count: draftCount },
    { count: mandatoryCount },
    { data: categories },
  ] = await Promise.all([
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true })),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published')),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'draft')),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_mandatory', true)),
    supabase.from('course_categories').select('id, name').eq('status', 'active').order('name'),
  ]);

  /* main courses query */
  let query = applyTenant(
    supabase
      .from('courses')
      .select('id, title, description, category, estimated_duration_minutes, status, is_mandatory, created_at, course_enrollments(count)')
      .order('created_at', { ascending: false })
  );

  if (status && ['draft', 'published', 'archived'].includes(status)) query = query.eq('status', status);
  if (cat)                   query = query.eq('category', cat);
  if (q?.trim())             query = query.ilike('title', `%${q.trim()}%`);
  if (mandatory === 'true')  query = query.eq('is_mandatory', true);
  if (mandatory === 'false') query = query.eq('is_mandatory', false);

  const { data: courses, error } = await query;

  const cats    = categories ?? [];
  const isTable = view === 'table';
  const needsMigration = error?.message?.includes('is_mandatory');

  return (
    <div className="min-h-screen bg-slate-50">

      {/* â•â• GRADIENT HERO HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1.5">áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜áƒ¡ áƒ‘áƒ˜áƒ‘áƒšáƒ˜áƒáƒ—áƒ”áƒ™áƒ</h1>
              <p className="text-indigo-200 text-sm">áƒ¡áƒáƒ¡áƒ¬áƒáƒ•áƒšáƒ áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜, áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ áƒžáƒ áƒáƒ’áƒ áƒáƒ›áƒ”áƒ‘áƒ˜ áƒ“áƒ áƒ’áƒ£áƒœáƒ“áƒ˜áƒ¡ áƒ’áƒáƒœáƒ•áƒ˜áƒ—áƒáƒ áƒ”áƒ‘áƒ</p>
            </div>
            <div className="flex-shrink-0">
              {['super_admin','hr_admin','ceo','tenant_super_admin'].includes(primaryRole) && (
                <CreateCourseButton categories={cats} companyId={activeCompanyId} />
              )}
            </div>
          </div>

          {/* Stats row â€” glass cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: GraduationCap, label: 'áƒ¡áƒ£áƒš áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜',    value: totalCount ?? 0,     sub: 'áƒ§áƒ•áƒ”áƒšáƒ áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜'       },
              { icon: TrendingUp,    label: 'áƒ’áƒáƒ›áƒáƒ¥áƒ•áƒ”áƒ§áƒœáƒ”áƒ‘áƒ£áƒšáƒ˜',  value: publishedCount ?? 0,  sub: 'áƒ®áƒ”áƒšáƒ›áƒ˜áƒ¡áƒáƒ¬áƒ•áƒ“áƒáƒ›áƒ˜'      },
              { icon: FileText,      label: 'áƒ›áƒáƒœáƒáƒ®áƒáƒ–áƒ˜',         value: draftCount ?? 0,      sub: 'áƒ’áƒáƒ›áƒáƒ£áƒ¥áƒ•áƒ”áƒ§áƒœáƒ”áƒ‘áƒ”áƒšáƒ˜'   },
              { icon: ShieldCheck,   label: 'áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ',      value: mandatoryCount ?? 0,  sub: 'áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ áƒžáƒ áƒáƒ’.' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm font-medium text-indigo-100 mt-0.5">{label}</p>
                <p className="text-xs text-indigo-300 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â•â• CONTENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Migration hint */}
        {needsMigration && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold mb-1">áƒ¡áƒáƒ­áƒ˜áƒ áƒáƒ DB áƒ›áƒ˜áƒ’áƒ áƒáƒªáƒ˜áƒ</p>
              <p className="text-xs mb-2 text-amber-700">
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">is_mandatory</code> áƒ¡áƒ•áƒ”áƒ¢áƒ˜ áƒáƒ  áƒáƒ áƒ¡áƒ”áƒ‘áƒáƒ‘áƒ¡.
                áƒ’áƒáƒ£áƒ¨áƒ•áƒ”áƒ— Supabase SQL Editor-áƒ¨áƒ˜:
              </p>
              <code className="block bg-amber-100 text-amber-900 px-3 py-2 rounded-lg text-xs font-mono">
                ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE;
              </code>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <CoursesToolbar categories={cats} />
        </div>

        {/* Generic error */}
        {error && !needsMigration && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
            <AlertCircle size={16} className="flex-shrink-0" />
            áƒ›áƒáƒœáƒáƒªáƒ”áƒ›áƒ”áƒ‘áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ: {error.message}
          </div>
        )}

        {/* Empty state */}
        {!error && (!courses || courses.length === 0) && (
          <div className="flex flex-col items-center justify-center py-28 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-5">
              <GraduationCap size={36} className="text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜ áƒáƒ  áƒ›áƒáƒ˜áƒ«áƒ”áƒ‘áƒœáƒ</h3>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              {q || status || cat || mandatory
                ? 'áƒ¤áƒ˜áƒšáƒ¢áƒ áƒ˜áƒ¡ áƒžáƒ˜áƒ áƒáƒ‘áƒ”áƒ‘áƒ¡ áƒ¨áƒ”áƒ”áƒ¡áƒáƒ‘áƒáƒ›áƒ”áƒ‘áƒ”áƒšáƒ˜ áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜ áƒ•áƒ”áƒ  áƒ›áƒáƒ˜áƒ«áƒ”áƒ‘áƒœáƒ. áƒ¡áƒªáƒáƒ“áƒ”áƒ— áƒ¡áƒ®áƒ•áƒ áƒ¤áƒ˜áƒšáƒ¢áƒ áƒ˜.'
                : 'áƒ¯áƒ”áƒ  áƒ™áƒ£áƒ áƒ¡áƒ”áƒ‘áƒ˜ áƒáƒ  áƒ’áƒáƒ¥áƒ•áƒ—. áƒ¨áƒ”áƒ¥áƒ›áƒ”áƒœáƒ˜áƒ— áƒžáƒ˜áƒ áƒ•áƒ”áƒšáƒ˜ áƒ™áƒ£áƒ áƒ¡áƒ˜ áƒ–áƒ”áƒ•áƒ˜áƒ“áƒáƒœ.'}
            </p>
          </div>
        )}

        {/* Card grid */}
        {!error && courses && courses.length > 0 && !isTable && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map((course: any) => (
              <CourseCard key={course.id} course={course} categories={cats} />
            ))}
          </div>
        )}

        {/* Table view */}
        {!error && courses && courses.length > 0 && isTable && (
          <CourseTable courses={courses} categories={cats} />
        )}
      </div>
    </div>
  );
}

/* â”€â”€ Course Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CourseCard({ course, categories }: { course: any; categories: any[] }) {
  const isMandatory = course.is_mandatory ?? false;
  const enrollCount = course.course_enrollments?.[0]?.count ?? 0;
  const grad        = STATUS_GRAD[course.status] ?? STATUS_GRAD.draft;

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">

      {/* Gradient header block */}
      <div className={`relative h-28 bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}>
        {/* background decorative circles */}
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center z-10 backdrop-blur-sm border border-white/30 shadow-lg">
          <GraduationCap size={26} className="text-white" />
        </div>
        {/* Status top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={course.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {course.category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <BookOpen size={10} />{course.category}
            </span>
          )}
          {isMandatory ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              <ShieldCheck size={10} />áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
              áƒ¡áƒ£áƒ áƒ•áƒ˜áƒšáƒ˜áƒ¡áƒáƒ›áƒ”áƒ‘áƒ 
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/dashboard/learning/courses/${course.id}`} className="block mb-2">
          <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
          {course.description ?? 'áƒáƒ¦áƒ¬áƒ”áƒ áƒ áƒáƒ  áƒáƒ áƒ˜áƒ¡.'}
        </p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-400 min-w-0">
          <span className="flex items-center gap-1 flex-shrink-0 font-medium">
            <Clock size={12} className="text-indigo-400" />
            {formatDuration(course.estimated_duration_minutes ?? 0)}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Users size={12} className="text-indigo-400" />{enrollCount}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Calendar size={12} className="text-indigo-400" />
            {formatDate(course.created_at)}
          </span>
        </div>
        <CourseCardActions course={course} categories={categories} />
      </div>
    </div>
  );
}

/* â”€â”€ Course Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CourseTable({ courses, categories }: { courses: any[]; categories: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['áƒ™áƒ£áƒ áƒ¡áƒ˜', 'áƒ™áƒáƒ¢áƒ”áƒ’áƒáƒ áƒ˜áƒ', 'áƒ®áƒáƒœáƒ’áƒ áƒ«áƒšáƒ˜áƒ•áƒáƒ‘áƒ', 'áƒ¢áƒ˜áƒžáƒ˜', 'áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜', 'áƒ›áƒáƒ¥áƒ›áƒ”áƒ“áƒ”áƒ‘áƒ'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((course: any) => {
              const isMandatory = course.is_mandatory ?? false;
              return (
                <tr key={course.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/learning/courses/${course.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      {course.title}
                    </Link>
                    {course.description && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{course.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {course.category
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <BookOpen size={10}/>{course.category}
                        </span>
                      : <span className="text-gray-400">â€”</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-indigo-400" />
                      {formatDuration(course.estimated_duration_minutes ?? 0)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {isMandatory
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          <ShieldCheck size={10}/>áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ
                        </span>
                      : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">áƒ¡áƒ£áƒ áƒ•áƒ˜áƒšáƒ˜áƒ¡áƒáƒ›áƒ”áƒ‘áƒ </span>}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={course.status} />
                  </td>
                  <td className="px-5 py-4">
                    <CourseCardActions course={course} categories={categories} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <p className="text-xs text-gray-400">{courses.length} áƒ™áƒ£áƒ áƒ¡áƒ˜</p>
      </div>
    </div>
  );
}

