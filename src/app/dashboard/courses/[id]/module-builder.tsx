'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  FileText, Video, File, HelpCircle, CheckSquare, ClipboardList,
  AlertCircle, Layers, GripVertical, BookOpen,
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
  { value: 'text',            label: 'სტატია',    icon: FileText,      color: 'bg-blue-50 text-blue-600' },
  { value: 'video',           label: 'ვიდეო',     icon: Video,         color: 'bg-purple-50 text-purple-600' },
  { value: 'pdf',             label: 'PDF',        icon: File,          color: 'bg-red-50 text-red-600' },
  { value: 'quiz',            label: 'ტესტი',     icon: HelpCircle,    color: 'bg-amber-50 text-amber-600' },
  { value: 'acknowledgement', label: 'დასტური',   icon: CheckSquare,   color: 'bg-green-50 text-green-600' },
  { value: 'assignment',      label: 'დავალება',  icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600' },
];
function typeConfig(t: string) { return LESSON_TYPES.find(x => x.value === t) ?? LESSON_TYPES[0]; }

/* ── Defaults ───────────────────────────────────────────────────────── */
const MOD_DEF  = { title: '', description: '' };
const LES_DEF  = { title: '', lesson_type: 'text', content: '', video_url: '', file_url: '', duration_minutes: 0, is_required: true };

/* ── Component ─────────────────────────────────────────────────────── */
export function ModuleBuilder({ initialModules, courseId, canManage }: Props) {
  const [modules, setModules]       = useState<CModule[]>(initialModules);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set(initialModules.map(m => m.id)));
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [deleting, setDeleting]     = useState<string | null>(null);

  /* module modal */
  const [modModal, setModModal]     = useState<{ open: boolean; mode: 'add' | 'edit'; mod?: CModule }>({ open: false, mode: 'add' });
  const [modForm, setModForm]       = useState(MOD_DEF);

  /* lesson modal */
  const [lesModal, setLesModal]     = useState<{ open: boolean; mode: 'add' | 'edit'; moduleId?: string; lesson?: CLessson }>({ open: false, mode: 'add' });
  const [lesForm, setLesForm]       = useState(LES_DEF);

  /* ── Reload from DB ──────────────────────────────────────────────── */
  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('course_modules')
      .select('*, course_lessons(*)')
      .eq('course_id', courseId)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'course_lessons' });
    if (data) setModules(data as CModule[]);
  };

  /* ── Module CRUD ─────────────────────────────────────────────────── */
  const openAddModule = () => {
    setModForm(MOD_DEF);
    setError('');
    setModModal({ open: true, mode: 'add' });
  };
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
      await supabase.from('course_modules').insert({
        course_id: courseId,
        title: modForm.title.trim(),
        description: modForm.description.trim() || null,
        sort_order: nextOrder,
      });
    } else if (modModal.mod) {
      await supabase.from('course_modules').update({
        title: modForm.title.trim(),
        description: modForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', modModal.mod.id);
    }
    setLoading(false);
    setModModal({ open: false, mode: 'add' });
    await reload();
    if (modModal.mode === 'add' && modules.length === 0) setExpanded(new Set());
  };
  const deleteModule = async (modId: string) => {
    if (!confirm('მოდულის წაშლა? ყველა გაკვეთილიც წაიშლება.')) return;
    setDeleting(modId);
    const supabase = createClient();
    await supabase.from('course_modules').delete().eq('id', modId);
    setDeleting(null);
    await reload();
  };

  /* ── Lesson CRUD ─────────────────────────────────────────────────── */
  const openAddLesson = (moduleId: string) => {
    setLesForm(LES_DEF);
    setError('');
    setLesModal({ open: true, mode: 'add', moduleId });
  };
  const openEditLesson = (lesson: CLessson) => {
    setLesForm({
      title: lesson.title,
      lesson_type: lesson.lesson_type,
      content: lesson.content ?? '',
      video_url: lesson.video_url ?? '',
      file_url: lesson.file_url ?? '',
      duration_minutes: lesson.duration_minutes,
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
      const nextOrder = mod.course_lessons.length > 0 ? Math.max(...mod.course_lessons.map(l => l.sort_order)) + 1 : 0;
      await supabase.from('course_lessons').insert({
        module_id:       lesModal.moduleId,
        course_id:       courseId,
        title:           lesForm.title.trim(),
        lesson_type:     lesForm.lesson_type,
        content:         lesForm.content.trim() || null,
        video_url:       lesForm.video_url.trim() || null,
        file_url:        lesForm.file_url.trim() || null,
        duration_minutes: Number(lesForm.duration_minutes) || 0,
        is_required:     lesForm.is_required,
        sort_order:      nextOrder,
      });
    } else if (lesModal.lesson) {
      await supabase.from('course_lessons').update({
        title:           lesForm.title.trim(),
        lesson_type:     lesForm.lesson_type,
        content:         lesForm.content.trim() || null,
        video_url:       lesForm.video_url.trim() || null,
        file_url:        lesForm.file_url.trim() || null,
        duration_minutes: Number(lesForm.duration_minutes) || 0,
        is_required:     lesForm.is_required,
        updated_at:      new Date().toISOString(),
      }).eq('id', lesModal.lesson.id);
    }
    setLoading(false);
    setLesModal({ open: false, mode: 'add' });
    await reload();
    if (lesModal.moduleId) setExpanded(prev => new Set([...prev, lesModal.moduleId!]));
  };
  const deleteLesson = async (lessonId: string) => {
    if (!confirm('გაკვეთილის წაშლა?')) return;
    setDeleting(lessonId);
    const supabase = createClient();
    await supabase.from('course_lessons').delete().eq('id', lessonId);
    setDeleting(null);
    await reload();
  };

  /* ── Toggle expand ───────────────────────────────────────────────── */
  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      {canManage && (
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">{modules.length} მოდული · {modules.reduce((s, m) => s + m.course_lessons.length, 0)} გაკვეთილი</p>
          <button
            onClick={openAddModule}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />მოდულის დამატება
          </button>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <Layers size={26} className="text-indigo-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">მოდულები არ არის</p>
          <p className="text-xs text-gray-400">კურსში მოდული დაამატეთ სასწავლო კონტენტის სტრუქტურირებისთვის.</p>
          {canManage && (
            <button
              onClick={openAddModule}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus size={14} />პირველი მოდულის დამატება
            </button>
          )}
        </div>
      )}

      {/* Module list */}
      <div className="space-y-3">
        {modules.map((mod, mIdx) => {
          const isOpen = expanded.has(mod.id);
          return (
            <div key={mod.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">

              {/* Module header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/60 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(mod.id)}>
                {canManage && <GripVertical size={14} className="text-gray-300 flex-shrink-0" />}
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {String(mIdx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{mod.title}</p>
                  {mod.description && <p className="text-xs text-gray-400 truncate">{mod.description}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{mod.course_lessons.length} გაკვ.</span>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModule(mod)}
                      className="p-1.5 rounded-lg hover:bg-white hover:text-indigo-600 text-gray-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteModule(mod.id)} disabled={deleting === mod.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors disabled:opacity-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
                {isOpen ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
              </div>

              {/* Lessons */}
              {isOpen && (
                <div>
                  {mod.course_lessons.length === 0 && (
                    <div className="px-5 py-4 text-center">
                      <p className="text-xs text-gray-400">გაკვეთილები არ არის.</p>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100">
                    {mod.course_lessons.map((lesson, lIdx) => {
                      const tc = typeConfig(lesson.lesson_type);
                      const Icon = tc.icon;
                      return (
                        <li key={lesson.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                          {canManage && <GripVertical size={12} className="text-gray-200 flex-shrink-0" />}
                          <span className="text-xs text-gray-400 w-5 flex-shrink-0">{lIdx + 1}.</span>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{lesson.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-gray-400">{tc.label}</span>
                              {lesson.duration_minutes > 0 && (
                                <span className="text-[11px] text-gray-400">· {lesson.duration_minutes} წთ</span>
                              )}
                              {!lesson.is_required && (
                                <span className="text-[11px] text-gray-400">· სურვილისამებრ</span>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditLesson(lesson)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 transition-colors">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteLesson(lesson.id)} disabled={deleting === lesson.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors disabled:opacity-50">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {canManage && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                      <button onClick={() => openAddLesson(mod.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                        <Plus size={13} />გაკვეთილის დამატება
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Module Modal ─────────────────────────────────────────────── */}
      {modModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModModal({ open: false, mode: 'add' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Layers size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {modModal.mode === 'add' ? 'ახალი მოდული' : 'მოდულის რედაქტირება'}
              </h2>
            </div>
            <form onSubmit={saveModule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  სათაური <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus type="text"
                  value={modForm.title}
                  onChange={e => setModForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: შესავალი კურსში"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  აღწერა (არასავალდებულო)
                </label>
                <textarea
                  rows={3}
                  value={modForm.description}
                  onChange={e => setModForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="მოდულის მოკლე აღწერა..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModModal({ open: false, mode: 'add' })}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  გაუქმება
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {loading ? 'ინახება...' : modModal.mode === 'add' ? 'შექმნა' : 'შენახვა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lesson Modal ─────────────────────────────────────────────── */}
      {lesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLesModal({ open: false, mode: 'add' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <BookOpen size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {lesModal.mode === 'add' ? 'ახალი გაკვეთილი' : 'გაკვეთილის რედაქტირება'}
              </h2>
            </div>
            <form onSubmit={saveLesson} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  სათაური <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus type="text"
                  value={lesForm.title}
                  onChange={e => setLesForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: კომპანიის ისტორია"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Lesson type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ტიპი</label>
                <div className="grid grid-cols-3 gap-2">
                  {LESSON_TYPES.map(lt => {
                    const Icon = lt.icon;
                    const active = lesForm.lesson_type === lt.value;
                    return (
                      <button
                        key={lt.value} type="button"
                        onClick={() => setLesForm(p => ({ ...p, lesson_type: lt.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                          active
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[11px] font-medium leading-tight">{lt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content fields based on type */}
              {(lesForm.lesson_type === 'text' || lesForm.lesson_type === 'acknowledgement') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">კონტენტი</label>
                  <textarea
                    rows={5}
                    value={lesForm.content}
                    onChange={e => setLesForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="გაკვეთილის ტექსტი..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
              {lesForm.lesson_type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ვიდეოს URL</label>
                  <input type="url"
                    value={lesForm.video_url}
                    onChange={e => setLesForm(p => ({ ...p, video_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              {(lesForm.lesson_type === 'pdf' || lesForm.lesson_type === 'assignment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ფაილის URL</label>
                  <input type="url"
                    value={lesForm.file_url}
                    onChange={e => setLesForm(p => ({ ...p, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              {lesForm.lesson_type === 'quiz' && (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
                  ტესტის შინაარსი "კითხვარები" ჩანართიდან იმართება.
                </div>
              )}

              {/* Duration + Required */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ხანგრძლივობა (წთ)
                  </label>
                  <input type="number" min={0}
                    value={lesForm.duration_minutes}
                    onChange={e => setLesForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">სავალდებულო</label>
                  <button
                    type="button"
                    onClick={() => setLesForm(p => ({ ...p, is_required: !p.is_required }))}
                    className={`relative inline-flex h-10 w-full rounded-xl border-2 items-center justify-center text-sm font-medium transition-all ${
                      lesForm.is_required
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}
                  >
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
              <button type="button" onClick={saveLesson} disabled={loading}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {loading ? 'ინახება...' : lesModal.mode === 'add' ? 'შექმნა' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
