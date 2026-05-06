'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  FileText, Video, File, HelpCircle, CheckSquare, ClipboardList,
  AlertCircle, Layers, BookOpen, ExternalLink, PlayCircle,
  MoreVertical, SlidersHorizontal, Copy, History, Eye, EyeOff,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
interface CLesson {
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
  is_published?: boolean; // requires migration 009_lesson_published.sql
}
interface CModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  course_lessons: CLesson[];
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

/* ── Portal dropdown ─────────────────────────────────────────────────
   Renders into document.body — bypasses any overflow:hidden ancestor.
   ─────────────────────────────────────────────────────────────────── */
interface DDState { id: string; rect: DOMRect; }

function PortalMenu({
  dd, id, close, children, rightAlign = false,
}: {
  dd: DDState | null; id: string; close: () => void;
  children: React.ReactNode; rightAlign?: boolean;
}) {
  if (!dd || dd.id !== id) return null;
  const { rect } = dd;
  const spaceBelow = window.innerHeight - rect.bottom;
  const goUp = spaceBelow < 280;
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    minWidth: Math.max(rect.width, 192),
    ...(rightAlign ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    ...(goUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
  };
  return createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={close} />
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1" style={style}>
        {children}
      </div>
    </>,
    document.body,
  );
}

/* ── Component ─────────────────────────────────────────────────────── */
export function ModuleBuilder({ initialModules, courseId, canManage }: Props) {
  const [modules, setModules]           = useState<CModule[]>(initialModules);
  const [expanded, setExpanded]         = useState<Set<string>>(new Set(initialModules.map(m => m.id)));
  const [selectedLesson, setSelectedLesson] = useState<CLesson | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [cloning, setCloning]           = useState<string | null>(null);

  /* single open-dropdown state */
  const [dd, setDd] = useState<DDState | null>(null);
  const openDD = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDd(prev => prev?.id === id ? null : { id, rect });
  };
  const closeDD = () => setDd(null);

  /* module modal */
  const [modModal, setModModal] = useState<{ open: boolean; mode: 'add' | 'edit'; mod?: CModule }>({ open: false, mode: 'add' });
  const [modForm, setModForm]   = useState(MOD_DEF);

  /* lesson edit modal */
  const [lesModal, setLesModal] = useState<{ open: boolean; mode: 'add' | 'edit'; moduleId?: string; lesson?: CLesson }>({ open: false, mode: 'add' });
  const [lesForm, setLesForm]   = useState(LES_DEF);

  /* rename modal */
  const [renameModal, setRenameModal] = useState<{ open: boolean; lesson: CLesson | null }>({ open: false, lesson: null });
  const [renameTitle, setRenameTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  /* delete confirm modal */
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; lesson: CLesson | null }>({ open: false, lesson: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* version history placeholder modal */
  const [historyModal, setHistoryModal] = useState(false);

  /* ── Reload ──────────────────────────────────────────────────────── */
  const reload = async () => {
    const sb = createClient();
    const { data } = await sb
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
    const sb = createClient();
    if (modModal.mode === 'add') {
      const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order)) + 1 : 0;
      const { data: inserted, error: err } = await sb
        .from('course_modules')
        .insert({ course_id: courseId, title: modForm.title.trim(), description: modForm.description.trim() || null, sort_order: nextOrder })
        .select().single();
      setLoading(false);
      if (err) { setError(err.message); return; }
      setModModal({ open: false, mode: 'add' });
      setModules(prev => [...prev, { ...inserted, course_lessons: [] } as CModule]);
      setExpanded(prev => new Set([...prev, inserted.id]));
    } else if (modModal.mod) {
      const { error: err } = await sb
        .from('course_modules')
        .update({ title: modForm.title.trim(), description: modForm.description.trim() || null })
        .eq('id', modModal.mod.id);
      setLoading(false);
      if (err) { setError(err.message); return; }
      setModModal({ open: false, mode: 'add' });
      await reload();
    }
  };
  const deleteModule = async (modId: string) => {
    if (!confirm('სექციის წაშლა? ყველა გაკვეთილიც წაიშლება.')) return;
    const sb = createClient();
    const { error: err } = await sb.from('course_modules').delete().eq('id', modId);
    if (err) { setError(err.message); return; }
    setModules(prev => prev.filter(m => m.id !== modId));
    setSelectedLesson(prev => {
      if (!prev) return null;
      const mod = modules.find(m => m.id === modId);
      return mod?.course_lessons.some(l => l.id === prev.id) ? null : prev;
    });
  };

  /* ── Lesson CRUD ─────────────────────────────────────────────────── */
  const openAddLesson = (moduleId: string, lessonType = 'text') => {
    setLesForm({ ...LES_DEF, lesson_type: lessonType });
    setError('');
    setLesModal({ open: true, mode: 'add', moduleId });
  };
  const openEditLesson = (lesson: CLesson) => {
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
    const sb = createClient();

    if (lesModal.mode === 'add') {
      const mod = modules.find(m => m.id === lesModal.moduleId);
      const nextOrder = mod ? Math.max(...mod.course_lessons.map(l => l.sort_order ?? 0), -1) + 1 : 0;
      const { data: inserted, error: err } = await sb
        .from('course_lessons')
        .insert({
          module_id:        lesModal.moduleId,
          title:            lesForm.title.trim(),
          lesson_type:      lesForm.lesson_type,
          content:          lesForm.content.trim() || null,
          video_url:        lesForm.video_url.trim() || null,
          file_url:         lesForm.file_url.trim() || null,
          sort_order:       nextOrder,
          duration_minutes: lesForm.duration_minutes,
          is_required:      lesForm.is_required,
        })
        .select().single();
      setLoading(false);
      if (err) { setError(err.message); return; }
      const mid = lesModal.moduleId!;
      setLesModal({ open: false, mode: 'add' });
      const newLesson = inserted as CLesson;
      setModules(prev => prev.map(m => m.id === mid ? { ...m, course_lessons: [...m.course_lessons, newLesson] } : m));
      setExpanded(prev => new Set([...prev, mid]));
      setSelectedLesson(newLesson);

    } else if (lesModal.lesson) {
      const { error: err } = await sb
        .from('course_lessons')
        .update({
          title:            lesForm.title.trim(),
          lesson_type:      lesForm.lesson_type,
          content:          lesForm.content.trim() || null,
          video_url:        lesForm.video_url.trim() || null,
          file_url:         lesForm.file_url.trim() || null,
          duration_minutes: lesForm.duration_minutes,
          is_required:      lesForm.is_required,
        })
        .eq('id', lesModal.lesson.id);
      setLoading(false);
      if (err) { setError(err.message); return; }
      const updated: CLesson = { ...lesModal.lesson, ...lesForm, title: lesForm.title.trim() };
      const mid = lesModal.moduleId!;
      setLesModal({ open: false, mode: 'add' });
      setModules(prev => prev.map(m =>
        m.id === mid ? { ...m, course_lessons: m.course_lessons.map(l => l.id === updated.id ? updated : l) } : m
      ));
      if (selectedLesson?.id === updated.id) setSelectedLesson(updated);
    }
  };

  /* ── Rename ──────────────────────────────────────────────────────── */
  const openRenameLesson = (lesson: CLesson) => {
    closeDD();
    setRenameTitle(lesson.title);
    setRenameModal({ open: true, lesson });
  };
  const saveRename = async () => {
    if (!renameModal.lesson || !renameTitle.trim()) return;
    setRenameLoading(true);
    const sb = createClient();
    const { error: err } = await sb
      .from('course_lessons')
      .update({ title: renameTitle.trim() })
      .eq('id', renameModal.lesson.id);
    setRenameLoading(false);
    if (err) { setError(err.message); return; }
    const updated = { ...renameModal.lesson, title: renameTitle.trim() };
    setModules(prev => prev.map(m => ({
      ...m,
      course_lessons: m.course_lessons.map(l => l.id === updated.id ? updated : l),
    })));
    if (selectedLesson?.id === updated.id) setSelectedLesson(updated);
    setRenameModal({ open: false, lesson: null });
  };

  /* ── Clone ───────────────────────────────────────────────────────── */
  const cloneLesson = async (lesson: CLesson) => {
    closeDD();
    setCloning(lesson.id);
    const sb = createClient();
    const mod = modules.find(m => m.course_lessons.some(l => l.id === lesson.id));
    const nextOrder = mod ? Math.max(...mod.course_lessons.map(l => l.sort_order ?? 0), -1) + 1 : 0;
    const { data: inserted, error: err } = await sb
      .from('course_lessons')
      .insert({
        module_id:        lesson.module_id,
        title:            `${lesson.title} (ასლი)`,
        lesson_type:      lesson.lesson_type,
        content:          lesson.content,
        video_url:        lesson.video_url,
        file_url:         lesson.file_url,
        sort_order:       nextOrder,
        duration_minutes: lesson.duration_minutes,
        is_required:      lesson.is_required,
      })
      .select().single();
    setCloning(null);
    if (err || !inserted) { setError(err?.message ?? 'შეცდომა'); return; }
    const clone = inserted as CLesson;
    setModules(prev => prev.map(m =>
      m.id === lesson.module_id ? { ...m, course_lessons: [...m.course_lessons, clone] } : m
    ));
    setSelectedLesson(clone);
  };

  /* ── Publish toggle ──────────────────────────────────────────────── */
  const togglePublish = async (lesson: CLesson) => {
    closeDD();
    const newVal = !(lesson.is_published ?? true);
    const sb = createClient();
    const { error: err } = await sb
      .from('course_lessons')
      .update({ is_published: newVal })
      .eq('id', lesson.id);
    if (err) {
      setError('გაუშვეთ migration 009_lesson_published.sql Supabase-ში.');
      return;
    }
    const updated = { ...lesson, is_published: newVal };
    setModules(prev => prev.map(m => ({
      ...m,
      course_lessons: m.course_lessons.map(l => l.id === updated.id ? updated : l),
    })));
    if (selectedLesson?.id === updated.id) setSelectedLesson(updated);
  };

  /* ── Delete (modal confirm) ──────────────────────────────────────── */
  const openDeleteConfirm = (lesson: CLesson) => {
    closeDD();
    setDeleteModal({ open: true, lesson });
  };
  const confirmDelete = async () => {
    const lesson = deleteModal.lesson;
    if (!lesson) return;
    setDeleteLoading(true);
    const sb = createClient();
    const { error: err } = await sb.from('course_lessons').delete().eq('id', lesson.id);
    setDeleteLoading(false);
    if (err) { setError(err.message); return; }
    setModules(prev => prev.map(m => ({ ...m, course_lessons: m.course_lessons.filter(l => l.id !== lesson.id) })));
    if (selectedLesson?.id === lesson.id) setSelectedLesson(null);
    setDeleteModal({ open: false, lesson: null });
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

  /* ── Right panel ─────────────────────────────────────────────────── */
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
    const isDraft = !(selectedLesson.is_published ?? true);
    return (
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${tc.badgeColor}`}>
                <Icon size={11} />{tc.label}
              </span>
              {isDraft && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                  <EyeOff size={10} />draft
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight break-words">
              {selectedLesson.title}
            </h2>
          </div>
          {canManage && (
            <button
              onClick={() => openEditLesson(selectedLesson)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0 shadow-sm"
            >
              <Pencil size={13} />რედაქტირება
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-5">
          {selectedLesson.lesson_type === 'text' && (
            selectedLesson.content?.trim() ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</p>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                <FileText size={15} className="flex-shrink-0" />ტექსტი არ არის — დაამატეთ „რედაქტირება"-ს გამოყენებით.
              </div>
            )
          )}
          {selectedLesson.lesson_type === 'acknowledgement' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckSquare size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800 mb-0.5">დასტური</p>
                  <p className="text-xs text-green-700 leading-relaxed">მომხმარებელი დაადასტურებს, რომ გაეცნო ამ მასალას.</p>
                </div>
              </div>
              {selectedLesson.content?.trim() && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</p>
              )}
            </div>
          )}
          {selectedLesson.lesson_type === 'video' && (
            selectedLesson.video_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
                  <a href={selectedLesson.video_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate">{selectedLesson.video_url}</a>
                </div>
                {(() => {
                  const embed = getYouTubeEmbed(selectedLesson.video_url!);
                  return embed ? (
                    <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                      <iframe src={embed} title={selectedLesson.title} className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen />
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
                <Video size={15} className="flex-shrink-0" />ვიდეო ბმული არ არის მითითებული.
              </div>
            )
          )}
          {selectedLesson.lesson_type === 'pdf' && (
            selectedLesson.file_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <File size={13} className="text-gray-400 flex-shrink-0" />
                  <a href={selectedLesson.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate">
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
                <File size={15} className="flex-shrink-0" />ფაილი არ არის.
              </div>
            )
          )}
          {selectedLesson.lesson_type === 'quiz' && (
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
          )}
          {selectedLesson.lesson_type === 'assignment' && (
            <div className="space-y-3">
              {selectedLesson.file_url && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
                  <File size={13} className="text-gray-400 flex-shrink-0" />
                  <a href={selectedLesson.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate">
                    {decodeURIComponent(selectedLesson.file_url.split('/').pop() ?? selectedLesson.file_url)}
                  </a>
                  <ExternalLink size={11} className="text-gray-300 flex-shrink-0 ml-auto" />
                </div>
              )}
              {selectedLesson.content?.trim() ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ინსტრუქცია</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                  <ClipboardList size={15} className="flex-shrink-0" />ინსტრუქციები არ არის.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Dropdown item class helpers ─────────────────────────────────── */
  const ddRow = 'flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left';

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="-m-6 flex" style={{ minHeight: 580 }}>

      {/* ── LEFT PANEL ── */}
      <div className="w-[280px] xl:w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/60">

        {/* header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-700">{modules.length}</span> სექცია
            {' · '}
            <span className="font-semibold text-gray-700">{totalLessons}</span> გაკვ.
          </p>
        </div>

        {/* module/lesson tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {modules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <Layers size={22} className="text-indigo-300" />
              </div>
              <p className="text-xs font-semibold text-gray-600 mb-1">სექციები არ არის</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">დაამატეთ სექცია კონტენტის სტრუქტურირებისთვის.</p>
              {canManage && (
                <button onClick={openAddModule}
                  className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                  <Plus size={12} />სექციის დამატება
                </button>
              )}
            </div>
          )}

          {modules.map((mod, mIdx) => {
            const isOpen = expanded.has(mod.id);
            return (
              <div key={mod.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">

                {/* module header */}
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
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{mod.course_lessons.length}</span>

                  {canManage && (
                    <div className="opacity-0 group-hover/mhdr:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={e => openDD(`mod-${mod.id}`, e)}
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <MoreVertical size={12} />
                      </button>
                      <PortalMenu dd={dd} id={`mod-${mod.id}`} close={closeDD} rightAlign>
                        <button onClick={() => { closeDD(); openEditModule(mod); }}
                          className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}>
                          <Pencil size={11} />რედაქტირება
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={() => { closeDD(); deleteModule(mod.id); }}
                          className={`${ddRow} text-red-600 hover:bg-red-50`}>
                          <Trash2 size={11} />წაშლა
                        </button>
                      </PortalMenu>
                    </div>
                  )}

                  {isOpen
                    ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
                </div>

                {/* lessons */}
                {isOpen && (
                  <>
                    {mod.course_lessons.length === 0 && (
                      <div className="px-4 py-3 border-t border-gray-100 text-center">
                        <p className="text-[11px] text-gray-400">გაკვეთილები არ არის</p>
                      </div>
                    )}

                    {mod.course_lessons.map(lesson => {
                      const tc = typeConfig(lesson.lesson_type);
                      const Icon = tc.icon;
                      const isSelected = selectedLesson?.id === lesson.id;
                      const isDraft    = !(lesson.is_published ?? true);
                      const isCloning  = cloning === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={[
                            'group/lrow flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 cursor-pointer transition-colors',
                            isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-indigo-50/40',
                          ].join(' ')}
                        >
                          {/* type icon */}
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${isDraft ? 'opacity-40' : ''} ${tc.color}`}>
                            <Icon size={10} />
                          </div>

                          {/* title */}
                          <p className={[
                            'text-xs flex-1 truncate',
                            isSelected ? 'font-semibold text-indigo-700' :
                            isDraft    ? 'text-gray-400 italic'          : 'text-gray-700',
                          ].join(' ')}>
                            {lesson.title}
                          </p>

                          {/* draft badge */}
                          {isDraft && (
                            <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              draft
                            </span>
                          )}

                          {/* ⋮ actions — portal dropdown with all 6 items */}
                          {canManage && (
                            <div
                              className="opacity-0 group-hover/lrow:opacity-100 transition-opacity flex-shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={e => openDD(`les-${lesson.id}`, e)}
                                disabled={isCloning}
                                className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40"
                                title="მოქმედებები"
                              >
                                <MoreVertical size={12} />
                              </button>

                              <PortalMenu dd={dd} id={`les-${lesson.id}`} close={closeDD} rightAlign>
                                {/* mini label */}
                                <div className="px-3 pt-2 pb-1.5">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[160px]">
                                    {lesson.title}
                                  </p>
                                </div>
                                <div className="border-t border-gray-100" />

                                {/* 1 — Lesson options */}
                                <button
                                  onClick={() => { closeDD(); openEditLesson(lesson); }}
                                  className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                                >
                                  <SlidersHorizontal size={11} />გაკვეთილის პარამეტრები
                                </button>

                                {/* 2 — Rename */}
                                <button
                                  onClick={() => openRenameLesson(lesson)}
                                  className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                                >
                                  <Pencil size={11} />სახელის შეცვლა
                                </button>

                                {/* 3 — Clone */}
                                <button
                                  onClick={() => cloneLesson(lesson)}
                                  className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                                >
                                  <Copy size={11} />დუბლირება
                                </button>

                                {/* 4 — Version history */}
                                <button
                                  onClick={() => { closeDD(); setHistoryModal(true); }}
                                  className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                                >
                                  <History size={11} />ვერსიების ისტორია
                                </button>

                                {/* 5 — Publish / Unpublish */}
                                {isDraft ? (
                                  <button
                                    onClick={() => togglePublish(lesson)}
                                    className={`${ddRow} text-emerald-600 hover:bg-emerald-50`}
                                  >
                                    <Eye size={11} />გამოქვეყნება
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => togglePublish(lesson)}
                                    className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                                  >
                                    <EyeOff size={11} />გამოქვეყნების გაუქმება
                                  </button>
                                )}

                                {/* 6 — Delete */}
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => openDeleteConfirm(lesson)}
                                  className={`${ddRow} text-red-600 hover:bg-red-50 mb-0.5`}
                                >
                                  <Trash2 size={11} />წაშლა
                                </button>
                              </PortalMenu>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* add content footer */}
                    {canManage && (
                      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/60 rounded-b-xl">
                        <button
                          onClick={e => openDD(`add-${mod.id}`, e)}
                          className={[
                            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all w-full justify-center',
                            dd?.id === `add-${mod.id}`
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50',
                          ].join(' ')}
                        >
                          <Plus size={11} />კონტენტი
                          <ChevronDown size={10} className={`transition-transform ${dd?.id === `add-${mod.id}` ? 'rotate-180' : ''}`} />
                        </button>

                        <PortalMenu dd={dd} id={`add-${mod.id}`} close={closeDD}>
                          <div className="px-3 pt-2 pb-1.5 border-b border-gray-100">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">გაკვეთილის ტიპი</p>
                          </div>
                          {LESSON_TYPES.map(lt => {
                            const LIcon = lt.icon;
                            return (
                              <button
                                key={lt.value}
                                onClick={() => { closeDD(); openAddLesson(mod.id, lt.value); }}
                                className={`${ddRow} text-gray-700 hover:bg-indigo-50 hover:text-indigo-700`}
                              >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${lt.color}`}>
                                  <LIcon size={11} />
                                </span>
                                {lt.label}
                              </button>
                            );
                          })}
                        </PortalMenu>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* add section */}
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

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0 bg-white overflow-y-auto">
        <RightPanel />
      </div>

      {/* ════════════════════ MODALS ════════════════════ */}

      {/* Section modal */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">სათაური <span className="text-red-400">*</span></label>
                <input autoFocus type="text" value={modForm.title}
                  onChange={e => setModForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: შესავალი კურსში"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  აღწერა <span className="text-gray-400 font-normal">(არასავალდებულო)</span>
                </label>
                <textarea rows={3} value={modForm.description}
                  onChange={e => setModForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="სექციის მოკლე აღწერა..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
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

      {/* Lesson edit modal */}
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
                  {lesModal.mode === 'add' ? 'ახალი გაკვეთილი' : 'გაკვეთილის პარამეტრები'}
                </h2>
                {lesModal.moduleId && (() => {
                  const parentMod = modules.find(m => m.id === lesModal.moduleId);
                  return parentMod ? <p className="text-xs text-indigo-400 truncate mt-0.5">↳ {parentMod.title}</p> : null;
                })()}
              </div>
            </div>
            <form id="lesson-form" onSubmit={saveLesson} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">სათაური <span className="text-red-400">*</span></label>
                <input autoFocus type="text" value={lesForm.title}
                  onChange={e => setLesForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="მაგ: კომპანიის ისტორია"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
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
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
                </div>
              )}
              {lesForm.lesson_type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ვიდეოს URL</label>
                  <input type="url" value={lesForm.video_url}
                    onChange={e => setLesForm(p => ({ ...p, video_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              )}
              {(lesForm.lesson_type === 'pdf' || lesForm.lesson_type === 'assignment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ფაილის URL</label>
                  <input type="url" value={lesForm.file_url}
                    onChange={e => setLesForm(p => ({ ...p, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
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
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
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

      {/* ── Rename modal ── */}
      {renameModal.open && renameModal.lesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRenameModal({ open: false, lesson: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Pencil size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">სახელის შეცვლა</h2>
            </div>
            <div className="p-6 space-y-4">
              <input
                autoFocus
                type="text"
                value={renameTitle}
                onChange={e => setRenameTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveRename(); } }}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRenameModal({ open: false, lesson: null })}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={saveRename}
                  disabled={renameLoading || !renameTitle.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {renameLoading && <Spinner />}
                  {renameLoading ? 'ინახება...' : 'შენახვა'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteModal.open && deleteModal.lesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, lesson: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">გაკვეთილის წაშლა?</h2>
              <p className="text-sm text-gray-500 mb-1 leading-relaxed">
                <span className="font-semibold text-gray-700">„{deleteModal.lesson.title}"</span> სამუდამოდ წაიშლება.
              </p>
              <p className="text-xs text-gray-400 mb-6">ამ მოქმედების გაუქმება შეუძლებელია.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, lesson: null })}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Spinner />}
                  {deleteLoading ? 'იშლება...' : 'წაშლა'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Version history placeholder modal ── */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                <History size={16} className="text-gray-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">ვერსიების ისტორია</h2>
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <History size={26} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">ვერსიების ისტორია მალე დაემატება.</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                ყოველი შენახვის ავტომატური snapshot და rollback შესაძლებლობა.
              </p>
              <button
                onClick={() => setHistoryModal(false)}
                className="mt-6 px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
