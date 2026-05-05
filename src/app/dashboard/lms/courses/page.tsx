import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CourseFilters } from './course-filters';
import { EditCourseButton, DeleteCourseButton } from './course-actions';
import { Plus, Clock, Users, GraduationCap } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'კურსები' };

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-rose-100 text-rose-700',
};

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function CoursesPage({ searchParams }: Props) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const canManage = canManageCourses(roles);

  let query = supabase
    .from('courses')
    .select('id, title, description, category, difficulty, estimated_duration_minutes, passing_score, status, course_enrollments(count)')
    .order('created_at', { ascending: false });

  if (status === 'draft' || status === 'published' || status === 'archived') {
    query = query.eq('status', status);
  }
  if (q?.trim()) {
    query = query.ilike('title', `%${q.trim()}%`);
  }

  const { data: courses, error } = await query;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">კურსები</h1>
              <p className="text-indigo-200 text-sm">სასწავლო კონტენტის ბიბლიოთეკა</p>
            </div>
            {canManage && (
              <Link href="/dashboard/lms/courses/new">
                <Button><Plus size={16} /> ახალი კურსი</Button>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{courses?.length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">სულ კურსი</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{courses?.filter((c: any) => c.status === 'published').length ?? 0}</p>
              <p className="text-sm text-indigo-200 mt-0.5">გამოქვეყნებული</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <CourseFilters />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {error ? (
            <div className="px-6 py-12 text-center text-sm text-red-500">
              მონაცემების ჩატვირთვა ვერ მოხერხდა: {error.message}
            </div>
          ) : !courses || courses.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                <GraduationCap size={24} className="text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">კურსები არ მოიძებნა.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['სათაური', 'კატეგორია', 'სირთულე', 'ხანგრძლივობა', 'რეგისტრ.', 'სტატუსი', ''].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((course: any) => (
                    <tr key={course.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/lms/courses/${course.id}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {course.title}
                        </Link>
                        {course.description && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{course.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {course.category ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          DIFFICULTY_COLORS[course.difficulty] ?? 'bg-gray-100 text-gray-600',
                        ].join(' ')}>
                          {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-indigo-400" />
                          {formatDuration(course.estimated_duration_minutes)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-indigo-400" />
                          {course.course_enrollments?.[0]?.count ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={course.status} />
                      </td>
                      <td className="px-4 py-4">
                        {canManage && (
                          <div className="flex items-center gap-1 justify-end">
                            <EditCourseButton course={course} />
                            <DeleteCourseButton id={course.id} title={course.title} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
