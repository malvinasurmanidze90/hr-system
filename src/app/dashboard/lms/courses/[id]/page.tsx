import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryRole, canManageCourses } from '@/lib/auth/permissions';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LessonList } from './lesson-list';
import { QuizSection } from './quiz-section';
import { EnrollSection } from './enroll-section';
import { GraduationCap, Clock, ArrowLeft, Users, FileText, HelpCircle } from 'lucide-react';
import { formatDate, formatDuration, DIFFICULTY_COLORS, cn } from '@/lib/utils';
import Link from 'next/link';
import type { UserRoleAssignment } from '@/types';

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const canManage = canManageCourses(roles);

  const { data: course } = await supabase.from('courses').select('*').eq('id', params.id).single();
  if (!course) notFound();

  const { data: lessons } = await supabase.from('lessons').select('*').eq('course_id', params.id).order('sort_order');
  const { data: quizzes } = await supabase.from('quizzes').select('*, quiz_questions(count)').eq('course_id', params.id);
  const { data: enrollment } = await supabase.from('course_enrollments').select('*').eq('course_id', params.id).eq('user_id', user.id).single();
  const { data: lessonProgress } = await supabase.from('lesson_progress').select('*').eq('user_id', user.id).in('lesson_id', lessons?.map(l => l.id) ?? []);
  const { data: enrollments } = await supabase.from('course_enrollments').select('*').eq('course_id', params.id);

  const completedLessons = lessonProgress?.filter(lp => lp.completed_at).length ?? 0;
  const totalLessons = lessons?.length ?? 0;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/dashboard/lms/courses">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> All Courses</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course header */}
          <Card>
            <div className="h-40 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-t-xl flex items-center justify-center">
              <GraduationCap size={60} className="text-white opacity-50" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
                <StatusBadge status={course.status} />
              </div>
              {course.description && <p className="text-sm text-gray-600 mb-4">{course.description}</p>}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={cn('badge', DIFFICULTY_COLORS[course.difficulty as keyof typeof DIFFICULTY_COLORS] ?? 'bg-gray-100 text-gray-600')}>
                  {course.difficulty}
                </span>
                <span className="flex items-center gap-1 text-gray-500"><Clock size={14} />{formatDuration(course.estimated_duration_minutes)}</span>
                <span className="flex items-center gap-1 text-gray-500"><Users size={14} />{enrollments?.length ?? 0} enrolled</span>
                <span className="flex items-center gap-1 text-gray-500"><FileText size={14} />{totalLessons} lessons</span>
                <span className="flex items-center gap-1 text-gray-500"><HelpCircle size={14} />{quizzes?.length ?? 0} quizzes</span>
              </div>
              {course.category && <p className="text-xs text-gray-400 mt-3">Category: {course.category}</p>}
            </CardContent>
          </Card>

          {/* Lessons */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lessons ({totalLessons})</CardTitle>
                {canManage && (
                  <Link href={`/dashboard/lms/courses/${course.id}/lessons/new`}>
                    <Button size="sm">+ Add Lesson</Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <LessonList lessons={lessons ?? []} lessonProgress={lessonProgress ?? []} courseId={course.id} canManage={canManage} />
          </Card>

          {/* Quizzes */}
          <QuizSection quizzes={quizzes ?? []} courseId={course.id} canManage={canManage} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Enrollment / progress */}
          <Card>
            <CardContent className="p-5">
              {enrollment ? (
                <>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Your Progress</p>
                  <Progress value={progressPct} showLabel size="lg" className="mb-3" />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{completedLessons} / {totalLessons} lessons completed</p>
                    <p>Status: <span className="font-medium">{enrollment.status.replace(/_/g, ' ')}</span></p>
                    {enrollment.due_date && <p>Due: {formatDate(enrollment.due_date)}</p>}
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500 mb-3">You are not enrolled in this course</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enroll section for admins */}
          {canManage && <EnrollSection courseId={course.id} />}

          {/* Course details */}
          <Card>
            <CardContent className="p-5 space-y-2 text-sm">
              <p className="font-semibold text-gray-900 mb-2">Course Details</p>
              <div className="flex justify-between text-gray-500"><span>Version</span><span>v{course.version}</span></div>
              <div className="flex justify-between text-gray-500"><span>Passing Score</span><span>{course.passing_score}%</span></div>
              <div className="flex justify-between text-gray-500"><span>Created</span><span>{formatDate(course.created_at)}</span></div>
              {course.published_at && <div className="flex justify-between text-gray-500"><span>Published</span><span>{formatDate(course.published_at)}</span></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
