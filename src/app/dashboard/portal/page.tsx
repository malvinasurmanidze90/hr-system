import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Clock, CheckCircle, BookOpen, Calendar, UserCheck } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'My Learning' };

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, course:courses(id, title, description, difficulty, estimated_duration_minutes, category, status)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false });

  const { data: onboardings } = await supabase
    .from('employee_onboarding')
    .select('*, program:onboarding_programs(name, duration_days)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const total = enrollments?.length ?? 0;
  const completed = enrollments?.filter(e => e.status === 'completed').length ?? 0;
  const inProgress = enrollments?.filter(e => e.status === 'in_progress').length ?? 0;
  const overdue = enrollments?.filter(e => e.status === 'overdue').length ?? 0;

  const summaryStats = [
    { icon: GraduationCap, label: 'სულ კურსი',    value: total,      color: 'from-indigo-500 to-indigo-600' },
    { icon: CheckCircle,   label: 'დასრულებული',  value: completed,  color: 'from-emerald-500 to-emerald-600' },
    { icon: Clock,         label: 'მიმდინარე',    value: inProgress, color: 'from-violet-500 to-violet-600' },
    { icon: BookOpen,      label: 'ვადაგადაცილ.', value: overdue,    color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">ჩემი სწავლება</h1>
            <p className="text-indigo-200 text-sm">კურსები, ონბორდინგი და მიღწევები</p>
          </div>

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
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* My Courses */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">ჩემი კურსები</h2>
            {enrollments?.map((enrollment: any) => {
              const course = enrollment.course;
              if (!course) return null;
              return (
                <Link key={enrollment.id} href={`/dashboard/lms/courses/${course.id}`}>
                  <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-4 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <GraduationCap size={22} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-700 transition-colors">{course.title}</p>
                          <StatusBadge status={enrollment.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDuration(course.estimated_duration_minutes)} · {course.difficulty}</p>
                        {enrollment.due_date && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={10} /> ვადა: {formatDate(enrollment.due_date)}
                          </p>
                        )}
                        <div className="mt-2">
                          <Progress
                            value={enrollment.status === 'completed' ? 100 : enrollment.status === 'in_progress' ? 50 : 0}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {(!enrollments || enrollments.length === 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap size={24} className="text-indigo-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">კურსები ჯერ არ დაგინიშნავთ.</p>
              </div>
            )}
          </div>

          {/* Onboarding */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">ონბორდინგი</h2>
            {onboardings?.map((ob: any) => (
              <div key={ob.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <UserCheck size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{ob.program?.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(ob.start_date)}
                      </span>
                      <StatusBadge status={ob.status} />
                    </div>
                    {ob.expected_end_date && (
                      <p className="text-xs text-gray-400 mt-1">ვადა: {formatDate(ob.expected_end_date)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!onboardings || onboardings.length === 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center">
                <p className="text-sm text-gray-400">ონბორდინგი არ დაგინიშნავთ.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
