'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  FileText, Video, File, HelpCircle, CheckSquare, ClipboardList,
  AlertCircle, Layers, GripVertical, BookOpen, ExternalLink, PlayCircle,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface CLessson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: string;
  content: string | null;
  video_url: string | null;
  file_url: string | null;
  sort_order: number;
  is_required: boolean;
  duration_minutes: number;
}
interface CModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  course_lessons: CLessson[];
}
interface Props {
  initialModules: CModule[];
  courseId: string;
  canManage: boolean;
}

/* ── Lesson type config ─────────────────────────────────────────────── */
const LESSON_TYPES = [
  { value: 'text',            label: 'სტატია',   icon: FileText,      color: 'bg-blue-50 text-blue-600',     badgeColor: 'bg-blue-100 text-blue-700' },
  { value: 'video',           label: 'ვიდეო',    icon: Video,         color: 'bg-purple-50 text-purple-600',  badgeColor: 'bg-purple-100 text-purple-700' },
  { value: 'pdf',             label: 'PDF',       icon: File,          color: 'bg-red-50 text-red-600',        badgeColor: 'bg-red-100 text-red-700' },
  { value: 'quiz',            label: 'ტესტი',    icon: HelpCircle,    color: 'bg-amber-50 text-amber-600',    badgeColor: 'bg-amber-100 text-amber-700' },
  { value: 'acknowledgement', label: 'დასტური',  icon: CheckSquare,   color: 'bg-green-50 text-green-600',    badgeColor: 'bg-green-100 text-green-700' },
  { value: 'assignment',      label: 'დავალება', icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600',  badgeColor: 'bg-indigo-100 text-indigo-700' },
];
function typeConfig(t: string) { return LESSON_TYPES.find(x => x.value === t) ?? LESSON_TYPES[0]; }

/* ── Defaults ───────────────────────────────────────────────────────── */
const MOD_DEF = { title: '', description: '' };
const LES_DEF = { title: '', lesson_type: 'text', content: '', video_url: '', file_url: '', duration_minutes: 0, is_required: true };

/* ── Spinner ─────────────────────────────────────────────────────────── */
const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────────── */
export function ModuleBuilder({ initialModules, courseId, canManage }: Props) {
  const [modules, setModules]           = useState<CModule[]>(initialModules);
  const [expanded, setExpanded]         = useState<Set<string>>(new Set(initialModules.map(m => m.id)));
  const [selectedLesson, setSelectedLesson] = useState<CLessson | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [modModal, setModModal] = useState<{ open: boolean; mode: 'add' | 'edit'; mod?: CModule }>({ open: false, mode: 'add' });
  const [modForm, setModForm]   = useState(MOD_DEF);

  const [lesModal, setLesModal] = useState<{ open: boolean; mode: 'add' | 'edit'; moduleId?: string; lesson?: CLessson }>({ open: false, mode: 'add' });
  const [lesForm, setLesForm]   = useState(LES_DEF);

  /* ── Reload ──────────────────────────────────────────────────────── */
  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('course_modules').select('*, course_lessons(*)')
      .eq('course_id', courseId)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'course_lessons' });
    if (data) setModules(data as CModule[]);
  };

  /* ── Module CRUD ─────────────────────────────────────────────────── */
  const openAddModule = () => { setModForm(MOD_DEF); setError(''); setModModal({ open: true, mode: 'add' }); };
  const openEditModule = (mod: CModule) => {
    setModForm({ title: mod.title, description: mod.description ?? '' });
    setError('');
    setModModal({ open: true, mode: 'edit', mod });
  };
  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modForm.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const supabase = createClient();

    if (modModal.mode === 'add') {
      const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order)) + 1 : 0;
      const { data: inserted, error: insertErr } = await supabase
        .from('course_modules')
        .insert({ course_id: courseId, title: modForm.title.trim(), description: modForm.description.trim() || null, sort_order: nextOrder })
        .select().single();

      setLoading(false);
      if (insertErr) { setError(insertErr.message); return; }
      setModModal({ open: false, mode: 'add' });
      setModules(prev => [...prev, { ...inserted, course_lessons: [] } as CModule]);
      setExpanded(prev => new Set([...prev, inserted.id]));

    } else if (modModal.mod) {
      const { error: updateErr } = await supabase
        .from('course_modules')
        .update({ title: modForm.title.trim(), description: modForm.description.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', modModal.mod.id);

      setLoading(false);
      if (updateErr) { setError(updateErr.message); return; }
      setModModal({ open: false, mode: 'add' });
      await reload();
    }
  };
  const deleteModule = async (modId: string) => {
    if (!confirm('სექციის წაშლა? ყველა გაკვეთილიც წაიშლება.')) return;
    setDeleting(modId);
    const supabase = createClient();
    const { error: delErr } = await supabase.from('course_modules').delete().eq('id', modId);
    setDeleting(null);
    if (delErr) { setError(delErr.message); return; }
    setModules(prev => prev.filter(m => m.id !== modId));
    // Clear selection if the deleted module contained the selected lesson
    setSelectedLesson(prev => {
      if (!prev) return null;
      const mod = modules.find(m => m.id === modId);
      return mod?.course_lessons.some(l => l.id === prev.id) ? null : prev;
    });
  };

  /* ── Lesson CRUD ─────────────────────────────────────────────────── */
  const openAddLesson = (moduleId: string, lessonType = 'text') => {
    setOpenDropdown(null);
    setLesForm({ ...LES_DEF, lesson_type: lessonType });
    setError('');
    setLesModal({ open: true, mode: 'add', moduleId });
  };
  const openEditLesson = (lesson: CLessson) => {
    setLesForm({
      title: lesson.title, lesson_type: lesson.lesson_type,
      content: lesson.content ?? '', video_url: lesson.video_url ?? '',
      file_url: lesson.file_url ?? '', duration_minutes: lesson.duration_minutes,
      is_required: lesson.is_required,
    });
    setError('');
    setLesModal({ open: true, mode: 'edit', moduleId: lesson.module_id, lesson });
  };
  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesForm.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const supabase = createClient();
    const mod = modules.find(m => m.id === lesModal.moduleId);

    if (lesModal.mode === 'add' && mod) {
      const { data: inserted, error: insertErr } = await supabase
        .from('course_lessons')
        .insert({
          module_id:   lesModal.moduleId,
          title:       lesForm.title.trim(),
          lesson_type: lesForm.lesson_type,
          content:     lesForm.content.trim() || null,
          video_url:   lesForm.video_url.trim() || null,
          file_url:    lesForm.file_url.trim() || null,
          // TODO: add sort_order, duration_minutes, is_required columns later if needed
        })
        .select().single();

      setLoading(false);
      if (insertErr) { setError(insertErr.message); return; }
      const capturedModuleId = lesModal.moduleId!;
      setLesModal({ open: false, mode: 'add' });
      const newLesson = inserted as CLessson;
      setModules(prev => prev.map(m =>
        m.id === capturedModuleId ? { ...m, course_lessons: [...m.course_lessons, newLesson] } : m
      ));
      setExpanded(prev => new Set([...prev, capturedModuleId]));
      setSelectedLesson(newLesson); // auto-select newly created lesson

    } else if (lesModal.lesson) {
      const { error: updateErr } = await supabase
        .from('course_lessons')
        .update({
          title:       lesForm.title.trim(),
          lesson_type: lesForm.lesson_type,
          content:     lesForm.content.trim() || null,
          video_url:   lesForm.video_url.trim() || null,
          file_url:    lesForm.file_url.trim() || null,
          // TODO: add duration_minutes, is_required columns later if needed
        })
        .eq('id', lesModal.lesson.id);

      setLoading(false);
      if (updateErr) { setError(updateErr.message); return; }
      const updatedLesson: CLessson = { ...lesModal.lesson, ...lesForm, title: lesForm.title.trim() };
      const capturedModuleId = lesModal.moduleId!;
      setLesModal({ open: false, mode: 'add' });
      setModules(prev => prev.map(m =>
        m.id === capturedModuleId
          ? { ...m, course_lessons: m.course_lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l) }
          : m
      ));
      // Keep right panel in sync with edited lesson
      if (selectedLesson?.id === updatedLesson.id) setSelectedLesson(updatedLesson);
    }
  };
  const deleteLesson = async (lessonId: string) => {
    if (!confirm('გაკვეთილის წაშლა?')) return;
    setDeleting(lessonId);
    const supabase = createClient();
    const { error: delErr } = await supabase.from('course_lessons').delete().eq('id', lessonId);
    setDeleting(null);
    if (delErr) { setError(delErr.message); return; }
    setModules(prev => prev.map(m => ({ ...m, course_lessons: m.course_lessons.filter(l => l.id !== lessonId) })));
    if (selectedLesson?.id === lessonId) setSelectedLesson(null);
  };

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalLessons = modules.reduce((s, m) => s + m.course_lessons.length, 0);

  /* ── YouTube embed helper ────────────────────────────────────────── */
  function getYouTubeEmbed(url: string): string | null {
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

  /* ── Right panel — selected lesson viewer ───────────────────────── */
  const RightPanel = () => {
    if (!selectedLesson) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">კონტენტი არ არის არჩეული</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            აირჩიეთ გაკვეთილი მარცხნივ ან დაამატეთ ახალი კონტენტი.
          </p>
        </div>
      );
    }

    const tc = typeConfig(selectedLesson.lesson_type);
    const Icon = tc.icon;

    return (
      <div className="p-6 h-full overflow-y-auto">
        {/* Lesson header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${tc.badgeColor}`}>
              <Icon size={11} />{tc.label}
            </span>
            <h2 className="text-xl font-bold text-gray-900 leading-tight break-words">
              {selectedLesson.title}
            </h2>
          </div>
          {canManage && (
            <button
              onClick={() => openEditLesson(selectedLesson)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0 shadow-sm"
            >
              <Pencil size={13} />
              რედაქტირება
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-5">

          {/* ── Text ── */}
          {selectedLesson.lesson_type === 'text' && (
            selectedLesson.content?.trim() ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedLesson.content}
              </p>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <FileText size={15} className="flex-shrink-0" />
                ტექსტი არ არის — დაამატეთ „რედაქტირება"-ს გამოყენებით.
              </div>
            )
          )}

          {/* ── Acknowledgement ── */}
          {selectedLesson.lesson_type === 'acknowledgement' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckSquare size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800 mb-0.5">დასტური</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    მომხმარებელი დაადასტურებს, რომ გაეცნო ამ მასალას.
                  </p>
                </div>
              </div>
              {selectedLesson.content?.trim() && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedLesson.content}
                </p>
              )}
            </div>
          )}

          {/* ── Video ── */}
          {selectedLesson.lesson_type === 'video' && (
            selectedLesson.video_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={selectedLesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate"
                  >
                    {selectedLesson.video_url}
                  </a>
                </div>
                {(() => {
                  const embedUrl = getYouTubeEmbed(selectedLesson.video_url);
                  return embedUrl ? (
                    <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                      <iframe
                        src={embedUrl}
                        title={selectedLesson.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center gap-3">
                      <PlayCircle size={44} className="text-white/25" />
                      <p className="text-xs text-white/40">YouTube URL-ისთვის embed ავტომატურად გამოჩნდება</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <Video size={15} className="flex-shrink-0" />
                ვიდეო ბმული არ არის მითითებული — დაამატეთ „რედაქტირება"-ს გამოყენებით.
              </div>
            )
          )}

          {/* ── PDF ── */}
          {selectedLesson.lesson_type === 'pdf' && (
            selectedLesson.file_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <File size={13} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={selectedLesson.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate"
                  >
                    {decodeURIComponent(selectedLesson.file_url.split('/').pop() ?? selectedLesson.file_url)}
                  </a>
                  <ExternalLink size={11} className="text-gray-300 flex-shrink-0 ml-auto" />
                </div>
                <div className="h-44 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-2">
                  <File size={30} className="text-red-300" />
                  <p className="text-xs text-red-400">PDF გადახედვა ხელმისაწვდომი არ არის</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <File size={15} className="flex-shrink-0" />
                ფაილი არ არის — დაამატეთ „რედაქტირება"-ს გამოყენებით.
              </div>
            )
          )}

          {/* ── Quiz ── */}
          {selectedLesson.lesson_type === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <HelpCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-0.5">ტესტი</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    კითხვარის კონსტრუქტორი დაემატება შემდეგ ეტაპზე.
                    ახლა გადადით „ქვიზები" ჩანართზე კვიზის პარამეტრების სამართავად.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Assignment ── */}
          {selectedLesson.lesson_type === 'assignment' && (
            <div className="space-y-3">
              {selectedLesson.file_url && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <File size={13} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={selectedLesson.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate"
                  >
                    {decodeURIComponent(selectedLesson.file_url.split('/').pop() ?? selectedLesson.file_url)}
                  </a>
                  <ExternalLink size={11} className="text-gray-300 flex-shrink-0 ml-auto" />
                </div>
              )}
              {selectedLesson.content?.trim() ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ინსტრუქცია</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedLesson.content}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                  <ClipboardList size={15} className="flex-shrink-0" />
                  ინსტრუქციები არ არის — დაამატეთ „რედაქტირება"-ს გამოყენებით.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    /* Break out of parent p-6 to fill the card edge-to-edge */
    <div className="-m-6 flex" style={{ minHeight: 580 }}>

      {/* Click-away overlay for footer dropdown */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}

      {/* ── LEFT PANEL: Course structure ── */}
      <div className="w-[280px] xl:w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/60">

        {/* Panel header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-700">{modules.length}</span> სექცია
            {' · '}
            <span className="font-semibold text-gray-700">{totalLessons}</span> გაკვ.
          </p>
        </div>

        {/* Module + lesson tree — scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {/* Empty state */}
          {modules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <Layers size={22} className="text-indigo-300" />
              </div>
              <p className="text-xs font-semibold text-gray-600 mb-1">სექციები არ არის</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                დაამატეთ სექცია კონტენტის სტრუქტურირებისთვის.
              </p>
              {canManage && (
                <button
                  onClick={openAddModule}
                  className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <Plus size={12} />სექციის დამატება
                </button>
              )}
            </div>
          )}

          {/* Modules */}
          {modules.map((mod, mIdx) => {
            const isOpen = expanded.has(mod.id);
            const isDropdownOpen = openDropdown === mod.id;
            return (
              <div key={mod.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">

                {/* Module header row */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none group/mhdr rounded-t-xl bg-gradient-to-r from-gray-50 to-white hover:bg-gray-100/80 transition-colors"
                  onClick={() => toggleExpand(mod.id)}
                >
                  <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {String(mIdx + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs font-semibold text-gray-800 flex-1 truncate group-hover/mhdr:text-indigo-700 transition-colors">
                    {mod.title}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {mod.course_lessons.length}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-0 opacity-0 group-hover/mhdr:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditModule(mod)} title="რედაქტირება"
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil size={10} />
                      </button>
                      <button onClick={() => deleteModule(mod.id)} disabled={deleting === mod.id} title="წაშლა"
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                  {isOpen
                    ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
                </div>

                {/* Lesson rows */}
                {isOpen && (
                  <>
                    {mod.course_lessons.length === 0 && (
                      <div className="px-4 py-3 border-t border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400">გაკვეთილები არ არის</p>
                      </div>
                    )}

                    {mod.course_lessons.map((lesson) => {
                      const tc = typeConfig(lesson.lesson_type);
                      const Icon = tc.icon;
                      const isSelected = selectedLesson?.id === lesson.id;
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={[
                            'group/lrow flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                              : 'hover:bg-indigo-50/40',
                          ].join(' ')}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                            <Icon size={10} />
                          </div>
                          <p className={`text-xs flex-1 truncate ${isSelected ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                            {lesson.title}
                          </p>
                          {canManage && (
                            <div className="flex items-center gap-0 opacity-0 group-hover/lrow:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEditLesson(lesson)} title="რედაქტირება"
                                className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <Pencil size={10} />
                              </button>
                              <button onClick={() => deleteLesson(lesson.id)} disabled={deleting === lesson.id} title="წაშლა"
                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Module footer — add content */}
                    {canManage && (
                      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/60 rounded-b-xl relative z-20">
                        <button
                          onClick={() => setOpenDropdown(isDropdownOpen ? null : mod.id)}
                          className={[
                            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all w-full justify-center',
                            isDropdownOpen
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50',
                          ].join(' ')}
                        >
                          <Plus size={11} />
                          კონტენტი
                          <ChevronDown size={10} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-3 right-3 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-30">
                            <div className="px-3 py-1.5 border-b border-gray-100">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">გაკვეთილის ტიპი</p>
                            </div>
                            {LESSON_TYPES.map(lt => {
                              const LIcon = lt.icon;
                              return (
                                <button
                                  key={lt.value}
                                  onClick={() => openAddLesson(mod.id, lt.value)}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${lt.color}`}>
                                    <LIcon size={11} />
                                  </span>
                                  {lt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add section — pinned to bottom of left panel */}
        {canManage && modules.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              onClick={openAddModule}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-500 border border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all"
            >
              <Plus size={12} />სექციის დამატება
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Content viewer ── */}
      <div className="flex-1 min-w-0 bg-white overflow-y-auto">
        <RightPanel />
      </div>

      {/* ── Section modal ─────────────────────────────────────────────── */}
      {modModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModModal({ open: false, mode: 'add' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Layers size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {modModal.mode === 'add' ? 'ახალი სექცია' : 'სექციის რედაქტირება'}
              </h2>
            </div>
            <form onSubmit={saveModule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  სათაური <span className="text-red-400">*</span>
                </label>
                <input autoFocus type="text" value={modForm.title}
                  onChange={e => setModForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: შესავალი კურსში"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  აღწერა <span className="text-gray-400 font-normal">(არასავალდებულო)</span>
                </label>
                <textarea rows={3} value={modForm.description}
                  onChange={e => setModForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="სექციის მოკლე აღწერა..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModModal({ open: false, mode: 'add' })}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  გაუქმება
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading && <Spinner />}
                  {loading ? 'ინახება...' : modModal.mode === 'add' ? 'შექმნა' : 'შენახვა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lesson modal ─────────────────────────────────────────────── */}
      {lesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLesModal({ open: false, mode: 'add' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <BookOpen size={16} className="text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">
                  {lesModal.mode === 'add' ? 'ახალი გაკვეთილი' : 'გაკვეთილის რედაქტირება'}
                </h2>
                {lesModal.moduleId && (() => {
                  const parentMod = modules.find(m => m.id === lesModal.moduleId);
                  return parentMod ? <p className="text-xs text-indigo-400 truncate mt-0.5">↳ {parentMod.title}</p> : null;
                })()}
              </div>
            </div>
            <form id="lesson-form" onSubmit={saveLesson} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  სათაური <span className="text-red-400">*</span>
                </label>
                <input autoFocus type="text" value={lesForm.title}
                  onChange={e => setLesForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: კომპანიის ისტორია"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ტიპი</label>
                <div className="grid grid-cols-3 gap-2">
                  {LESSON_TYPES.map(lt => {
                    const Icon = lt.icon;
                    const active = lesForm.lesson_type === lt.value;
                    return (
                      <button key={lt.value} type="button"
                        onClick={() => setLesForm(p => ({ ...p, lesson_type: lt.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                          active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        <Icon size={16} />
                        <span className="text-[11px] font-medium leading-tight">{lt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(lesForm.lesson_type === 'text' || lesForm.lesson_type === 'acknowledgement') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">კონტენტი</label>
                  <textarea rows={5} value={lesForm.content}
                    onChange={e => setLesForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="გაკვეთილის ტექსტი..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
              {lesForm.lesson_type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ვიდეოს URL</label>
                  <input type="url" value={lesForm.video_url}
                    onChange={e => setLesForm(p => ({ ...p, video_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              {(lesForm.lesson_type === 'pdf' || lesForm.lesson_type === 'assignment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ფაილის URL</label>
                  <input type="url" value={lesForm.file_url}
                    onChange={e => setLesForm(p => ({ ...p, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              {lesForm.lesson_type === 'quiz' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed">
                  ტესტის კითხვები „ქვიზები" ჩანართიდან იმართება. სახელი შეინახება.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ხანგრძლივობა (წთ)</label>
                  <input type="number" min={0} value={lesForm.duration_minutes}
                    onChange={e => setLesForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">სავალდებულო</label>
                  <button type="button" onClick={() => setLesForm(p => ({ ...p, is_required: !p.is_required }))}
                    className={`inline-flex h-10 w-full rounded-xl border-2 items-center justify-center text-sm font-medium transition-all ${
                      lesForm.is_required ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}>
                    {lesForm.is_required ? 'სავალდებულო' : 'სურვილისამებრ'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
            </form>
            <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
              <button type="button" onClick={() => setLesModal({ open: false, mode: 'add' })}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                გაუქმება
              </button>
              <button type="submit" form="lesson-form" disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {loading && <Spinner />}
                {loading ? 'ინახება...' : lesModal.mode === 'add' ? 'შექმნა' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
