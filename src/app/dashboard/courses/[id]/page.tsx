import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { CourseTabs } from './tabs';
import { QuizSection } from './quiz-section';
import { EnrolleesSection } from './enrollees-section';
import { ModuleBuilder } from './module-builder';
import {
  ArrowLeft, Clock, Users, BookOpen, HelpCircle, Award,
  ShieldCheck, BarChart2, Calendar, GraduationCap,
  CheckCircle2, PlayCircle, Target, Layers, Pencil,
} from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import type { UserRoleAssignment } from '@/types';

/* ── helpers ─────────────────────────────────────────────────────────── */
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

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { id }  = await params;
  const { tab } = await searchParams;
  const active  = tab ?? 'overview';

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
    { data: enrollment },
    { data: enrollments },
    { data: rawModules, error: modulesError },
  ] = await Promise.all([
    supabase.from('courses').select('*').eq('id', id).single(),
    supabase.from('quizzes').select('*, quiz_questions(count)').eq('course_id', id),
    supabase.from('course_enrollments').select('*').eq('course_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('course_enrollments').select('*').eq('course_id', id),
    supabase.from('course_modules')
      .select('*, course_lessons(*)')
      .eq('course_id', id)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'course_lessons' }),
  ]);

  if (!course) notFound();

  const modules      = rawModules ?? [];
  const totalModules = modules.length;
  const totalLessons = modules.reduce((s: number, m: any) => s + (m.course_lessons?.length ?? 0), 0);
  const enrollCount  = enrollments?.length ?? 0;
  const isMandatory  = course.is_mandatory ?? false;
  const gradient     = hashGradient(id);

  // enrollment progress (using lesson_progress for hero card if enrolled)
  const { data: flatLessons } = await supabase.from('lessons').select('id').eq('course_id', id);
  const lessonIds = flatLessons?.map((l: any) => l.id) ?? [];
  const { data: lessonProgress } = lessonIds.length
    ? await supabase.from('lesson_progress').select('*').eq('user_id', user.id).in('lesson_id', lessonIds)
    : { data: [] };
  const completedLessons = lessonProgress?.filter((lp: any) => lp.completed_at).length ?? 0;
  const progressPct = lessonIds.length > 0 ? Math.round((completedLessons / lessonIds.length) * 100) : 0;

  // completion breakdown
  const breakdown = {
    completed:   enrollments?.filter((e: any) => e.status === 'completed').length ?? 0,
    in_progress: enrollments?.filter((e: any) => e.status === 'in_progress').length ?? 0,
    not_started: enrollments?.filter((e: any) => e.status === 'not_started').length ?? 0,
  };

  const tabs = [
    { key: 'overview', label: 'მიმოხილვა' },
    { key: 'modules',  label: 'მოდულები',   count: totalModules },
    { key: 'quizzes',  label: 'კითხვარები', count: quizzes?.length ?? 0 },
    ...(canManage ? [{ key: 'progress', label: 'პროგრესი', count: enrollCount }] : []),
  ];

  const needsMigration = modulesError?.message?.includes('does not exist');

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <div className={`bg-gradient-to-br ${gradient}`}>
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-12">

          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard/courses"
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors group">
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              კურსების ბიბლიოთეკა
            </Link>
          </div>

          {/* Main hero content */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex-1 min-w-0">

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
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

              {/* Title */}
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-3">
                {course.title}
              </h1>

              {/* Description */}
              {course.description && (
                <p className="text-white/75 text-sm leading-relaxed max-w-2xl mb-6">
                  {course.description}
                </p>
              )}

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-5">
                {[
                  { icon: Clock,       val: formatDuration(course.estimated_duration_minutes ?? 0) },
                  { icon: Layers,      val: `${totalModules} მოდ. / ${totalLessons} გაკვ.` },
                  { icon: HelpCircle,  val: `${quizzes?.length ?? 0} კითხვარი` },
                  { icon: Users,       val: `${enrollCount} რეგ.` },
                  ...(course.certificate_enabled ? [{ icon: Award, val: 'სერტიფიკატი' }] : []),
                ].map(({ icon: Icon, val }) => (
                  <span key={val} className="flex items-center gap-1.5 text-sm text-white/70">
                    <Icon size={14} className="text-white/50" />{val}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress card */}
            {enrollment ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 lg:w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white">თქვენი პროგრესი</p>
                  {enrollment.status === 'completed' && <CheckCircle2 size={18} className="text-green-300" />}
                  {enrollment.status === 'in_progress' && <PlayCircle size={18} className="text-white/60" />}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="6"/>
                      <circle cx="32" cy="32" r="26" fill="none"
                        stroke={progressPct === 100 ? '#86efac' : 'white'}
                        strokeOpacity="0.9" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - progressPct / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                      {progressPct}%
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{completedLessons}/{lessonIds.length}</p>
                    <p className="text-white/60 text-xs">გაკვეთილი</p>
                    {enrollment.due_date && (
                      <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                        <Calendar size={10} />ვადა: {formatDate(enrollment.due_date)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-px bg-white/10 mb-4" />
                <p className="text-xs text-white/60">
                  სტატუსი:{' '}
                  <span className="text-white font-medium">
                    {({ not_started: 'არ დაწყებულა', in_progress: 'მიმდინარეა', completed: 'დასრულებულია', overdue: 'ვადაგადაცილებული' } as Record<string,string>)[enrollment.status] ?? enrollment.status}
                  </span>
                </p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 lg:w-72 flex-shrink-0 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap size={22} className="text-white/60" />
                </div>
                <p className="text-sm font-medium text-white mb-1">კურსზე პროგრესი</p>
                <p className="text-xs text-white/60">ადმინის მიერ კურსზე დარეგისტრირების შემდეგ.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main column ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Migration warning */}
            {needsMigration && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                <p className="font-semibold mb-1">გაუშვეთ SQL მიგრაცია</p>
                <p className="text-xs text-amber-700 mb-2">Supabase SQL Editor-ში გაუშვეთ <code className="bg-amber-100 px-1 rounded">supabase/migrations/004_course_modules.sql</code></p>
              </div>
            )}

            {/* Tab panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 border-b border-gray-100">
                <CourseTabs tabs={tabs} current={active} />
              </div>

              <div className="p-6">

                {/* ─ Overview ─ */}
                {active === 'overview' && (
                  <div className="space-y-6">
                    {course.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">კურსის შესახებ</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">დეტალები</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { icon: BarChart2,  label: 'სირთულე',      val: DIFF_LABEL[course.difficulty] ?? course.difficulty ?? '—' },
                          { icon: Clock,      label: 'ხანგრძლივობა', val: formatDuration(course.estimated_duration_minutes ?? 0) },
                          { icon: Target,     label: 'გამსვლელი',    val: `${course.passing_score ?? 70}%` },
                          { icon: Layers,     label: 'მოდულები',     val: totalModules },
                          { icon: Calendar,   label: 'შეიქმნა',      val: formatDate(course.created_at) },
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
                  </div>
                )}

                {/* ─ Modules & Lessons ─ */}
                {active === 'modules' && (
                  <ModuleBuilder
                    initialModules={modules as any}
                    courseId={id}
                    canManage={canManage}
                  />
                )}

                {/* ─ Quizzes ─ */}
                {active === 'quizzes' && (
                  <QuizSection quizzes={quizzes ?? []} courseId={id} canManage={canManage} />
                )}

                {/* ─ Progress / Enrollees ─ */}
                {active === 'progress' && canManage && (
                  <EnrolleesSection courseId={id} />
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Course stats */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">კურსის სტატისტიკა</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { icon: Layers,     label: 'მოდულები',      val: totalModules },
                  { icon: BookOpen,   label: 'გაკვეთილები',   val: totalLessons },
                  { icon: HelpCircle, label: 'კითხვარები',    val: quizzes?.length ?? 0 },
                  { icon: Users,      label: 'რეგისტრანტები', val: enrollCount },
                  { icon: Clock,      label: 'ხანგრძლივობა',  val: formatDuration(course.estimated_duration_minutes ?? 0) },
                  { icon: Target,     label: 'გამსვლელი ქულა',val: `${course.passing_score ?? 70}%` },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="flex items-center gap-2.5 text-sm text-gray-500">
                      <Icon size={14} className="text-indigo-400" />{label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion breakdown */}
            {enrollCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">დასრულების მაჩვენებელი</h3>
                {[
                  { label: 'დასრულებული',  count: breakdown.completed,   color: 'bg-emerald-500' },
                  { label: 'მიმდინარე',    count: breakdown.in_progress, color: 'bg-indigo-500' },
                  { label: 'არ დაწყებულა', count: breakdown.not_started, color: 'bg-gray-300' },
                ].map(({ label, count, color }) => {
                  const pct = enrollCount > 0 ? Math.round((count / enrollCount) * 100) : 0;
                  return (
                    <div key={label} className="mb-3.5 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className="text-xs font-semibold text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Certificate badge */}
            {course.certificate_enabled && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Award size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">სერტიფიკატი</p>
                  <p className="text-xs text-amber-700 mt-0.5">კურსის დასრულებისას გაიცემა</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
