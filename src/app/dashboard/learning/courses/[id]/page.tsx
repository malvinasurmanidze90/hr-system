import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { CourseTabs } from './tabs';
import { QuizSection } from './quiz-section';
import { EnrolleesSection } from './enrollees-section';
import { ModuleBuilder } from './module-builder';
import { PublishButton } from './publish-button';
import { CourseSettings } from './course-settings';
import {
  ArrowLeft, Clock, Users, BookOpen, HelpCircle,
  ShieldCheck, BarChart2, Calendar, GraduationCap,
  CheckCircle2, Target, Layers, FileBox, AlertCircle,
} from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import type { UserRoleAssignment } from '@/types';

/* ── helpers ──────────────────────────────────────────────────────── */
const GRADIENTS = [
  'from-indigo-600 to-purple-700',
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-indigo-500 to-blue-700',
  'from-blue-700 to-violet-700',
];
const DIFF_LABEL: Record<string, string> = {
  beginner: 'დამწყები', intermediate: 'საშუალო', advanced: 'მოწინავე',
};
const DIFF_COLOR: Record<string, string> = {
  beginner:     'bg-emerald-100/80 text-emerald-700',
  intermediate: 'bg-amber-100/80 text-amber-700',
  advanced:     'bg-rose-100/80 text-rose-700',
};
function hashGradient(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) & 0xffff;
  return GRADIENTS[n % GRADIENTS.length];
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CourseBuilderPage({ params, searchParams }: Props) {
  const { id }  = await params;
  const { tab } = await searchParams;
  const active  = tab ?? 'content';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const canManage = canManageCourses(roles);

  const [
    { data: course },
    { data: quizzes },
    { data: enrollments },
    { data: rawModules, error: modulesError },
    { data: categories },
  ] = await Promise.all([
    supabase.from('courses').select('*').eq('id', id).single(),
    supabase.from('quizzes').select('*, quiz_questions(count)').eq('course_id', id),
    supabase.from('course_enrollments').select('*').eq('course_id', id),
    supabase.from('course_modules')
      .select('*, course_lessons(*)')
      .eq('course_id', id)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'course_lessons' }),
    supabase.from('course_categories').select('id, name').eq('status', 'active').order('name'),
  ]);

  if (!course) notFound();

  const modules      = rawModules ?? [];
  const totalModules = modules.length;
  const totalLessons = modules.reduce((s: number, m: any) => s + (m.course_lessons?.length ?? 0), 0);
  const enrollCount  = enrollments?.length ?? 0;
  const isMandatory  = course.is_mandatory ?? false;
  const gradient     = hashGradient(id);
  const needsMigration = modulesError?.message?.includes('does not exist');

  const tabs = [
    { key: 'content',  label: 'კონტენტი',  count: totalModules },
    { key: 'overview', label: 'მიმოხილვა' },
    { key: 'files',    label: 'ფაილები' },
    { key: 'quizzes',  label: 'ქვიზები',   count: quizzes?.length ?? 0 },
    ...(canManage ? [{ key: 'progress', label: 'პროგრესი', count: enrollCount }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ── Hero / Builder header ─────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${gradient}`}>
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-8">

          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard/learning/courses"
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              კურსების სია
            </Link>
            <div className="flex items-center gap-2">
              {totalLessons > 0 && (
                <Link
                  href={`/dashboard/learning/courses/${id}/learn`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
                >
                  <GraduationCap size={13} />გადახედვა
                </Link>
              )}
              {canManage && (
                <PublishButton courseId={id} currentStatus={course.status} />
              )}
            </div>
          </div>

          {/* Course identity */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <StatusBadge status={course.status} />
                {course.category && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm border border-white/20">
                    <BookOpen size={11} />{course.category}
                  </span>
                )}
                {course.difficulty && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${DIFF_COLOR[course.difficulty] ?? 'bg-white/15 text-white'}`}>
                    {DIFF_LABEL[course.difficulty] ?? course.difficulty}
                  </span>
                )}
                {isMandatory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/70 text-white border border-rose-300/30">
                    <ShieldCheck size={11} />სავალდებულო
                  </span>
                )}
              </div>

              <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight mb-2">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5 sm:flex-col sm:items-end text-right">
              {[
                { icon: Layers,     val: `${totalModules} სექცია` },
                { icon: BookOpen,   val: `${totalLessons} გაკვ.` },
                { icon: Users,      val: `${enrollCount} მონაწ.` },
                { icon: Clock,      val: formatDuration(course.estimated_duration_minutes ?? 0) },
              ].map(({ icon: Icon, val }) => (
                <span key={val} className="flex items-center gap-1.5 text-sm text-white/70">
                  <Icon size={13} className="text-white/50" />{val}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Builder body ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {needsMigration && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 mb-5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold mb-1">გაუშვეთ SQL მიგრაცია</p>
              <p className="text-xs text-amber-700">
                Supabase SQL Editor-ში გაუშვეთ{' '}
                <code className="bg-amber-100 px-1 rounded">supabase/migrations/004_course_modules.sql</code>
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="px-6 border-b border-gray-100">
            <CourseTabs tabs={tabs} current={active} />
          </div>

          <div className="p-6">

            {/* ── Content tab (module builder) ──────────────────── */}
            {active === 'content' && (
              <ModuleBuilder
                initialModules={modules as any}
                courseId={id}
                canManage={canManage}
              />
            )}

            {/* ── Overview tab ──────────────────────────────────── */}
            {active === 'overview' && (
              <div className="space-y-8">

                {/* Editable course settings */}
                <CourseSettings
                  course={course}
                  categories={categories ?? []}
                  canManage={canManage}
                />

                {/* Read-only stats */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">სტატისტიკა</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: Layers,       label: 'სექციები',     val: totalModules },
                      { icon: BookOpen,     label: 'გაკვეთილები',  val: totalLessons },
                      { icon: Calendar,     label: 'შეიქმნა',      val: formatDate(course.created_at) },
                      ...(course.published_at
                        ? [{ icon: CheckCircle2, label: 'გამოქვეყნდა', val: formatDate(course.published_at) }]
                        : []),
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Icon size={14} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completion breakdown */}
                {enrollCount > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">დასრულების მაჩვენებელი</h3>
                    {[
                      { label: 'დასრულებული',  count: enrollments?.filter((e: any) => e.status === 'completed').length ?? 0,   color: 'bg-emerald-500' },
                      { label: 'მიმდინარე',    count: enrollments?.filter((e: any) => e.status === 'in_progress').length ?? 0,  color: 'bg-indigo-500' },
                      { label: 'არ დაწყებული', count: enrollments?.filter((e: any) => e.status === 'not_started').length ?? 0, color: 'bg-gray-300' },
                    ].map(({ label, count, color }) => {
                      const pct = enrollCount > 0 ? Math.round((count / enrollCount) * 100) : 0;
                      return (
                        <div key={label} className="mb-3.5 last:mb-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-500">{label}</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {count} <span className="text-gray-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Files tab ─────────────────────────────────────── */}
            {active === 'files' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <FileBox size={26} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600 mb-1">ფაილები</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  კურსის დოკუმენტები, სლაიდები და დამხმარე მასალები.<br />
                  ფუნქცია მალე დაემატება.
                </p>
              </div>
            )}

            {/* ── Quizzes tab ───────────────────────────────────── */}
            {active === 'quizzes' && (
              <QuizSection quizzes={quizzes ?? []} courseId={id} canManage={canManage} />
            )}

            {/* ── Progress tab ──────────────────────────────────── */}
            {active === 'progress' && canManage && (
              <EnrolleesSection courseId={id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
