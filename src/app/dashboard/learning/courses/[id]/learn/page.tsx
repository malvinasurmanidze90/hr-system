import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { ArrowLeft } from 'lucide-react';
import { LessonPlayer } from './lesson-player';
import type { UserRoleAssignment } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LearnPage({ params }: Props) {
  const { id: courseId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const isAdmin = canManageCourses(roles);

  const [
    { data: course },
    { data: rawModules },
    { data: enrollment },
    { data: progress },
  ] = await Promise.all([
    supabase.from('courses').select('id, title, status').eq('id', courseId).single(),
    supabase
      .from('course_modules')
      .select('id, title, sort_order, course_lessons(id, title, lesson_type, content, video_url, file_url, sort_order, is_required, duration_minutes)')
      .eq('course_id', courseId)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'course_lessons' }),
    supabase
      .from('course_enrollments')
      .select('id, status, progress_percentage, due_date')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('course_lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', user.id),
  ]);

  if (!course) notFound();

  const modules = rawModules ?? [];
  const completedIds = new Set(
    (progress ?? []).filter(p => p.completed_at).map(p => p.lesson_id)
  );

  // Non-enrolled non-admins get a gate
  if (!enrollment && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full">
          <h1 className="text-base font-bold text-gray-900 mb-2">{course.title}</h1>
          <p className="text-sm text-gray-500 mb-6">
            ამ კურსში ჩარიცხული არ ხართ. HR-ს მიმართეთ დარეგისტრირებისთვის.
          </p>
          <Link
            href="/dashboard/portal"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={14} />ჩემი სწავლება
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Slim top bar */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        <Link
          href={isAdmin ? `/dashboard/learning/courses/${courseId}` : '/dashboard/portal'}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          {isAdmin ? 'Builder' : 'ჩემი კურსები'}
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-900 truncate">{course.title}</h1>
        {enrollment && (
          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
            {completedIds.size} / {modules.reduce((s, m) => s + (m.course_lessons?.length ?? 0), 0)} გაკვ.
          </span>
        )}
      </div>

      {/* Main split layout — fills remaining height */}
      <LessonPlayer
        modules={modules as any}
        courseId={courseId}
        userId={user.id}
        enrollmentId={enrollment?.id ?? null}
        initialCompletedIds={[...completedIds]}
        isEnrolled={!!enrollment}
        isAdmin={isAdmin}
      />
    </div>
  );
}
