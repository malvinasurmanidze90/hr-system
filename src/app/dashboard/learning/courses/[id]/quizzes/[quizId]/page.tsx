import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { QuizEditor } from './quiz-editor';
import type { UserRoleAssignment } from '@/types';

interface Props {
  params: Promise<{ id: string; quizId: string }>;
}

export default async function QuizEditorPage({ params }: Props) {
  const { id: courseId, quizId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const canManage = canManageCourses(roles);

  const [{ data: quiz }, { data: course }, { data: questions }] = await Promise.all([
    supabase.from('quizzes').select('*').eq('id', quizId).single(),
    supabase.from('courses').select('id, title').eq('id', courseId).single(),
    supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('sort_order'),
  ]);

  if (!quiz || !course) notFound();

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-6 pt-5 pb-7">
          <div className="flex items-center justify-between mb-5">
            <Link
              href={`/dashboard/learning/courses/${courseId}?tab=quizzes`}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              {course.title}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
              <p className="text-violet-200 text-sm mt-0.5">
                გამსვლელი: {quiz.passing_score}% · {quiz.max_attempts ?? '∞'} მცდელობა
                {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes}წთ` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <QuizEditor
          quizId={quizId}
          initialQuestions={questions ?? []}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
