'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Archive, X, AlertCircle, GraduationCap, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_duration_minutes: number;
  status: string;
  is_mandatory?: boolean;
}
interface Category { id: string; name: string }

/* ── Shared Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        checked ? 'bg-indigo-600' : 'bg-gray-200',
      ].join(' ')}
    >
      <span className={['inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
    </button>
  );
}

/* ── Icon button ───────────────────────────────────────────────────── */
function IconBtn({ onClick, title, color, children }: {
  onClick?: () => void; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${color}`}
    >
      {children}
    </button>
  );
}

/* ── Main export ───────────────────────────────────────────────────── */
export function CourseCardActions({ course, categories }: { course: Course; categories: Category[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen]       = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const [form, setForm] = useState({
    title:            course.title,
    description:      course.description ?? '',
    category:         course.category ?? '',
    duration_minutes: course.estimated_duration_minutes,
    is_mandatory:     course.is_mandatory ?? false,
    status:           course.status,
  });
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  /* Edit submit */
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      title:                      form.title.trim(),
      description:                form.description.trim() || null,
      category:                   form.category || null,
      estimated_duration_minutes: Number(form.duration_minutes),
      status:                     form.status,
      is_mandatory:               form.is_mandatory,
    };
    let { error: dbErr } = await supabase.from('courses').update(payload).eq('id', course.id);
    if (dbErr?.message?.includes('is_mandatory')) {
      delete payload.is_mandatory;
      const r = await supabase.from('courses').update(payload).eq('id', course.id);
      dbErr = r.error;
    }
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setEditOpen(false);
    router.refresh();
  };

  /* Archive submit */
  const handleArchive = async () => {
    setLoading(true); setError('');
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from('courses').update({ status: 'archived' }).eq('id', course.id);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setArchiveOpen(false);
    router.refresh();
  };

  return (
    <>
      {/* ── Inline action buttons ── */}
      <div className="flex items-center gap-0.5">
        <Link href={`/dashboard/learning/courses/${course.id}`}>
          <IconBtn title="გადახედვა" color="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
            <Eye size={15} />
          </IconBtn>
        </Link>
        <IconBtn
          onClick={() => { setError(''); setEditOpen(true); }}
          title="რედაქტირება"
          color="text-gray-400 hover:text-amber-600 hover:bg-amber-50"
        >
          <Pencil size={15} />
        </IconBtn>
        {course.status !== 'archived' && (
          <IconBtn
            onClick={() => { setError(''); setArchiveOpen(true); }}
            title="არქივი"
            color="text-gray-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <Archive size={15} />
          </IconBtn>
        )}
      </div>

      {/* ── Edit modal ──────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Pencil size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">კურსის რედაქტირება</h2>
                <p className="text-xs text-gray-400 truncate max-w-xs">{course.title}</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1">
              <form id="edit-course-form" onSubmit={handleEdit}>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">ძირითადი ინფორმაცია</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">სათაური <span className="text-red-400">*</span></label>
                    <input autoFocus type="text" value={form.title} onChange={e => set('title', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">აღწერა</label>
                    <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Tag size={12} className="text-gray-400" /> კატეგორია
                      </label>
                      <select value={form.category} onChange={e => set('category', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="">— კატეგორია —</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" /> ხანგრძლივობა (წთ)
                      </label>
                      <input type="number" min={1} value={form.duration_minutes}
                        onChange={e => set('duration_minutes', Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="px-6 py-5 space-y-5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">პარამეტრები</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">სტატუსი</label>
                    <div className="flex gap-3">
                      {[
                        { value: 'draft',     label: 'Draft',           desc: 'არ არის გამოქვეყნებული', border: 'border-gray-400 bg-gray-50 text-gray-700' },
                        { value: 'published', label: 'გამოქვეყნებული',  desc: 'ხელმისაწვდომია ყველასთვის', border: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
                        { value: 'archived',  label: 'არქივი',          desc: 'დამალულია ბიბლიოთეკიდან', border: 'border-rose-400 bg-rose-50 text-rose-700' },
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => set('status', opt.value)}
                          className={['flex-1 text-left p-3 rounded-xl border-2 transition-all',
                            form.status === opt.value ? `${opt.border} shadow-sm` : 'border-gray-200 hover:border-gray-300 bg-white'].join(' ')}>
                          <p className="text-xs font-semibold">{opt.label}</p>
                          <p className="text-[10px] opacity-70 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">სავალდებულო კურსი</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {form.is_mandatory ? 'ყველა მითითებული თანამშრომლისთვის სავალდებულოა' : 'სურვილისამებრ'}
                      </p>
                    </div>
                    <Toggle checked={form.is_mandatory} onChange={v => set('is_mandatory', v)} />
                  </div>
                </div>
              </form>
            </div>

            {/* footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
              {error && (
                <div className="flex items-center gap-2 flex-1 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  გაუქმება
                </button>
                <button type="submit" form="edit-course-form" disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {loading ? 'ინახება...' : 'შენახვა'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive confirm ──────────────────────────────────────── */}
      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setArchiveOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                <Archive size={22} className="text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center mb-2">კურსის არქივირება</h3>
              <p className="text-sm text-gray-500 text-center">
                კურსი <span className="font-medium text-gray-900">„{course.title}"</span> გაიხსნება
                არქივში და არ იქნება ხელმისაწვდომი თანამშრომლებისთვის.
              </p>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setArchiveOpen(false)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                გაუქმება
              </button>
              <button onClick={handleArchive} disabled={loading}
                className="flex-1 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {loading ? 'მიმდინარეობს...' : 'არქივირება'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
