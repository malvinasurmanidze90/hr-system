'use client';
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, CheckCircle2, Circle,
  FileText, Video, File, HelpCircle, CheckSquare, ClipboardList,
  ChevronLeft, ChevronRight as ChevronRightNav, ExternalLink, PlayCircle,
  BookOpen, Layers,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface Lesson {
  id: string;
  title: string;
  lesson_type: string;
  content: string | null;
  video_url: string | null;
  file_url: string | null;
  sort_order: number;
  is_required: boolean;
  duration_minutes: number;
}
interface Module {
  id: string;
  title: string;
  sort_order: number;
  course_lessons: Lesson[];
}
interface Props {
  modules: Module[];
  courseId: string;
  userId: string;
  enrollmentId: string | null;
  initialCompletedIds: string[];
  isEnrolled: boolean;
  isAdmin: boolean;
}

/* ── Lesson type config ─────────────────────────────────────────────── */
const TYPE_MAP: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  text:            { label: 'სტატია',    icon: FileText,      badge: 'bg-blue-100 text-blue-700' },
  video:           { label: 'ვიდეო',     icon: Video,         badge: 'bg-purple-100 text-purple-700' },
  pdf:             { label: 'PDF',        icon: File,          badge: 'bg-red-100 text-red-700' },
  quiz:            { label: 'ტესტი',     icon: HelpCircle,    badge: 'bg-amber-100 text-amber-700' },
  acknowledgement: { label: 'დასტური',   icon: CheckSquare,   badge: 'bg-green-100 text-green-700' },
  assignment:      { label: 'დავალება',  icon: ClipboardList, badge: 'bg-indigo-100 text-indigo-700' },
};
function typeConf(t: string) { return TYPE_MAP[t] ?? TYPE_MAP.text; }

/* ── YouTube embed ──────────────────────────────────────────────────── */
function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {}
  return null;
}

/* ── Spinner ─────────────────────────────────────────────────────────── */
const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Component ──────────────────────────────────────────────────────── */
export function LessonPlayer({
  modules,
  courseId,
  userId,
  enrollmentId,
  initialCompletedIds,
  isEnrolled,
  isAdmin,
}: Props) {
  const flatLessons = modules.flatMap(m => m.course_lessons);
  const totalLessons = flatLessons.length;

  // Default to first incomplete lesson, else first lesson
  const firstIncomplete = flatLessons.find(l => !initialCompletedIds.includes(l.id));
  const defaultLesson = firstIncomplete ?? flatLessons[0] ?? null;

  const [current, setCurrent]           = useState<Lesson | null>(defaultLesson);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const [expanded, setExpanded]         = useState<Set<string>>(new Set(modules.map(m => m.id)));
  const [marking, setMarking]           = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const currentIndex = current ? flatLessons.findIndex(l => l.id === current.id) : -1;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const isCompleted = current ? completedIds.has(current.id) : false;
  const progress = totalLessons > 0 ? Math.round((completedIds.size / totalLessons) * 100) : 0;

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /* ── Mark lesson complete ───────────────────────────────────────── */
  const markComplete = useCallback(async () => {
    if (!current || !isEnrolled || marking) return;
    setMarking(true);

    const sb = createClient();
    await sb.from('course_lesson_progress').upsert({
      lesson_id:    current.id,
      user_id:      userId,
      completed_at: new Date().toISOString(),
      started_at:   new Date().toISOString(),
    }, { onConflict: 'lesson_id,user_id' });

    const newCompleted = new Set([...completedIds, current.id]);
    setCompletedIds(newCompleted);

    const newPct = totalLessons > 0 ? Math.round((newCompleted.size / totalLessons) * 100) : 0;
    const newStatus = newPct >= 100 ? 'completed' : 'in_progress';

    if (enrollmentId) {
      await sb.from('course_enrollments').update({
        progress_percentage: newPct,
        status:              newStatus,
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      }).eq('id', enrollmentId);
    }

    setMarking(false);
    // Auto-advance to next lesson
    if (nextLesson) {
      setCurrent(nextLesson);
      setAcknowledged(false);
    }
  }, [current, isEnrolled, marking, completedIds, totalLessons, enrollmentId, nextLesson, userId]);

  /* ── Content viewer ─────────────────────────────────────────────── */
  const ContentView = () => {
    if (!current) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-10">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">გაკვეთილი არ არის არჩეული</p>
          <p className="text-xs text-gray-400 mt-1">სიდან აირჩიეთ გაკვეთილი.</p>
        </div>
      );
    }

    const conf = typeConf(current.lesson_type);
    const Icon = conf.icon;

    return (
      <div className="flex flex-col h-full">
        {/* Lesson header */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-100 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${conf.badge}`}>
            <Icon size={11} />{conf.label}
          </span>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{current.title}</h2>
          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 size={13} />დასრულებული
            </span>
          )}
        </div>

        {/* Lesson body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

          {/* Text */}
          {current.lesson_type === 'text' && (
            current.content?.trim() ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {current.content}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <FileText size={15} />კონტენტი ჯერ არ არის დამატებული.
              </div>
            )
          )}

          {/* Video */}
          {current.lesson_type === 'video' && (
            current.video_url ? (
              <div className="space-y-3">
                {(() => {
                  const embed = youtubeEmbed(current.video_url);
                  return embed ? (
                    <div className="aspect-video rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <iframe
                        src={embed}
                        title={current.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center gap-3">
                      <PlayCircle size={48} className="text-white/30" />
                      <a
                        href={current.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
                      >
                        <ExternalLink size={13} />ვიდეოს გახსნა ახალ ჩანართში
                      </a>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <Video size={15} />ვიდეოს ბმული არ არის.
              </div>
            )
          )}

          {/* PDF */}
          {current.lesson_type === 'pdf' && (
            current.file_url ? (
              <div className="space-y-3">
                <a
                  href={current.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <File size={18} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800 truncate">
                      {decodeURIComponent(current.file_url.split('/').pop() ?? 'PDF ფაილი')}
                    </p>
                    <p className="text-xs text-red-500">PDF გახსნა</p>
                  </div>
                  <ExternalLink size={15} className="text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <File size={15} />ფაილი არ არის.
              </div>
            )
          )}

          {/* Acknowledgement */}
          {current.lesson_type === 'acknowledgement' && (
            <div className="space-y-4">
              {current.content?.trim() && (
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {current.content}
                </div>
              )}
              {isEnrolled && !isCompleted && (
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  acknowledged ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 bg-white hover:border-emerald-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={e => setAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    ვადასტურებ, რომ გავეცანი და გავიგე ამ მასალის შინაარსი.
                  </span>
                </label>
              )}
              {isCompleted && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                  <CheckCircle2 size={15} />დადასტურებულია
                </div>
              )}
            </div>
          )}

          {/* Assignment */}
          {current.lesson_type === 'assignment' && (
            <div className="space-y-4">
              {current.content?.trim() && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ინსტრუქცია</p>
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {current.content}
                  </div>
                </div>
              )}
              {current.file_url && (
                <a
                  href={current.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <File size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-indigo-800 truncate">
                      {decodeURIComponent(current.file_url.split('/').pop() ?? 'ფაილი')}
                    </p>
                    <p className="text-xs text-indigo-500">ჩამოტვირთვა / გახსნა</p>
                  </div>
                  <ExternalLink size={15} className="text-indigo-400 flex-shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* Quiz */}
          {current.lesson_type === 'quiz' && (
            <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <HelpCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">ტესტი</p>
                <p className="text-sm text-amber-700">
                  ამ გაკვეთილის ტესტი „ქვიზები" ჩანართიდან ხელმისაწვდომია.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions bar */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center gap-3 flex-shrink-0">

          {/* Prev */}
          <button
            onClick={() => { if (prevLesson) { setCurrent(prevLesson); setAcknowledged(false); } }}
            disabled={!prevLesson}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />წინა
          </button>

          {/* Mark complete / completed indicator */}
          {isEnrolled && (
            <div className="flex-1 flex justify-center">
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 size={16} />დასრულებული
                </span>
              ) : (
                <button
                  onClick={current.lesson_type === 'acknowledgement' && !acknowledged ? undefined : markComplete}
                  disabled={marking || (current.lesson_type === 'acknowledgement' && !acknowledged)}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {marking ? <Spinner /> : <CheckCircle2 size={15} />}
                  {marking ? 'ინახება...' : 'დასრულებულია'}
                </button>
              )}
            </div>
          )}

          {/* Next */}
          <button
            onClick={() => { if (nextLesson) { setCurrent(nextLesson); setAcknowledged(false); } }}
            disabled={!nextLesson}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            შემდეგი<ChevronRightNav size={15} />
          </button>
        </div>
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  if (flatLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-10">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Layers size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-600">კონტენტი ჯერ არ არის</p>
        <p className="text-xs text-gray-400 mt-1">კურსი ჯერ შევსებული არ არის.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT: Sidebar with progress + module tree ── */}
      <div className="w-[280px] xl:w-[300px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">

        {/* Progress bar */}
        {isEnrolled && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500">პროგრესი</span>
              <span className="font-semibold text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {completedIds.size} / {totalLessons} გაკვეთილი
            </p>
          </div>
        )}

        {/* Module accordion */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {modules.map((mod, mIdx) => {
            const isOpen = expanded.has(mod.id);
            const modCompleted = mod.course_lessons.filter(l => completedIds.has(l.id)).length;
            return (
              <div key={mod.id} className="rounded-xl overflow-hidden border border-gray-200">

                {/* Module header */}
                <button
                  onClick={() => toggleExpand(mod.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {String(mIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 flex-1 text-left truncate">{mod.title}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {modCompleted}/{mod.course_lessons.length}
                  </span>
                  {isOpen
                    ? <ChevronDown size={11} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={11} className="text-gray-400 flex-shrink-0" />
                  }
                </button>

                {/* Lessons */}
                {isOpen && mod.course_lessons.map(lesson => {
                  const done = completedIds.has(lesson.id);
                  const isCurr = current?.id === lesson.id;
                  const conf = typeConf(lesson.lesson_type);
                  const Icon = conf.icon;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => { setCurrent(lesson); setAcknowledged(false); }}
                      className={[
                        'w-full flex items-center gap-2 px-3 py-2 border-t border-gray-100 text-left transition-colors',
                        isCurr
                          ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                          : 'hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {done
                        ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        : <Circle size={14} className={`flex-shrink-0 ${isCurr ? 'text-indigo-400' : 'text-gray-300'}`} />
                      }
                      <Icon size={11} className={`flex-shrink-0 ${isCurr ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <span className={`text-xs truncate flex-1 ${isCurr ? 'font-semibold text-indigo-700' : done ? 'text-gray-500' : 'text-gray-700'}`}>
                        {lesson.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Content viewer ── */}
      <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col">
        <ContentView />
      </div>
    </div>
  );
}
