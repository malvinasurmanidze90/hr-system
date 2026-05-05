'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Video, File, CheckCircle2, Circle,
  Trash2, Clock, Lock, PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lesson, LessonProgress } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface Props {
  lessons: Lesson[];
  lessonProgress: LessonProgress[];
  courseId: string;
  canManage: boolean;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  text: FileText, video: Video, pdf: File, document: File,
};
const TYPE_LABEL: Record<string, string> = {
  text: 'სტატია', video: 'ვიდეო', pdf: 'PDF', document: 'დოკუმენტი',
};
const TYPE_COLOR: Record<string, string> = {
  text:     'bg-blue-100 text-blue-600',
  video:    'bg-purple-100 text-purple-600',
  pdf:      'bg-red-100 text-red-600',
  document: 'bg-amber-100 text-amber-600',
};

export function LessonList({ lessons, lessonProgress, courseId, canManage }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const getStatus = (lessonId: string) => {
    const lp = lessonProgress.find(p => p.lesson_id === lessonId);
    if (!lp) return 'locked';
    if (lp.completed_at) return 'completed';
    if ((lp.progress_percentage ?? 0) > 0) return 'in_progress';
    return 'not_started';
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm('გაკვეთილის წაშლა?')) return;
    setDeleting(lessonId);
    const supabase = createClient();
    await supabase.from('lessons').delete().eq('id', lessonId);
    router.refresh();
    setDeleting(null);
  };

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <FileText size={22} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">გაკვეთილები არ არის</p>
        <p className="text-xs text-gray-400 mt-1">დაამატეთ პირველი გაკვეთილი</p>
      </div>
    );
  }

  const completedCount = lessons.filter(l => getStatus(l.id) === 'completed').length;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div>
      {/* Progress summary bar */}
      {lessonProgress.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{completedCount} / {lessons.length} გაკვეთილი დასრულებულია</span>
            <span className="font-semibold text-gray-900">{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700',
                pct === 100 ? 'bg-green-500' : 'bg-indigo-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Lesson rows */}
      <ul className="divide-y divide-gray-100">
        {lessons.map((lesson, idx) => {
          const Icon    = TYPE_ICON[lesson.lesson_type] ?? FileText;
          const status  = getStatus(lesson.id);
          const isDone  = status === 'completed';
          const isInProgress = status === 'in_progress';

          return (
            <li
              key={lesson.id}
              className={cn(
                'group flex items-center gap-4 px-6 py-4 transition-colors',
                isDone ? 'hover:bg-green-50/50' : 'hover:bg-gray-50',
              )}
            >
              {/* Number */}
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                isDone
                  ? 'bg-green-100 text-green-600'
                  : isInProgress
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400',
              )}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Type icon */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                isDone ? 'bg-green-100' : (TYPE_COLOR[lesson.lesson_type] ?? 'bg-gray-100 text-gray-400'),
              )}>
                <Icon size={16} className={isDone ? 'text-green-600' : ''} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isDone ? 'text-green-700' : 'text-gray-900',
                )}>
                  {lesson.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {TYPE_LABEL[lesson.lesson_type] ?? lesson.lesson_type}
                  </span>
                  {lesson.duration_minutes > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />{lesson.duration_minutes} წთ
                      </span>
                    </>
                  )}
                  {isInProgress && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-indigo-500 flex items-center gap-1">
                        <PlayCircle size={11} />მიმდინარე
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status icon */}
              <div className="flex-shrink-0">
                {isDone
                  ? <CheckCircle2 size={18} className="text-green-500" />
                  : isInProgress
                    ? <PlayCircle size={18} className="text-indigo-400" />
                    : status === 'not_started'
                      ? <Circle size={18} className="text-gray-300" />
                      : <Lock size={16} className="text-gray-300" />}
              </div>

              {/* Delete (managers) */}
              {canManage && (
                <button
                  onClick={() => handleDelete(lesson.id)}
                  disabled={deleting === lesson.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
