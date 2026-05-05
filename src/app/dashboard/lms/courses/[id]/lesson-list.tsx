'use client';
import { FileText, Video, File, CheckCircle2, Circle, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lesson, LessonProgress } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  lessons: Lesson[];
  lessonProgress: LessonProgress[];
  courseId: string;
  canManage: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  text: FileText, video: Video, pdf: File, document: File,
};

export function LessonList({ lessons, lessonProgress, courseId, canManage }: Props) {
  const router = useRouter();

  const isCompleted = (lessonId: string) =>
    lessonProgress.some(lp => lp.lesson_id === lessonId && lp.completed_at);

  const handleDelete = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    const supabase = createClient();
    await supabase.from('lessons').delete().eq('id', lessonId);
    router.refresh();
  };

  if (lessons.length === 0) {
    return <div className="px-6 py-10 text-center text-sm text-gray-400">No lessons yet. Add your first lesson.</div>;
  }

  return (
    <ul className="divide-y divide-gray-50">
      {lessons.map((lesson, idx) => {
        const Icon = TYPE_ICONS[lesson.lesson_type] ?? FileText;
        const done = isCompleted(lesson.id);
        return (
          <li key={lesson.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group">
            <span className="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
              done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium truncate', done ? 'text-green-700' : 'text-gray-900')}>{lesson.title}</p>
              <p className="text-xs text-gray-400">{lesson.duration_minutes}m · {lesson.lesson_type}</p>
            </div>
            {done ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" /> : <Circle size={16} className="text-gray-300 flex-shrink-0" />}
            {canManage && (
              <button onClick={() => handleDelete(lesson.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
