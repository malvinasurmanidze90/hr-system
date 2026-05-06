'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, GraduationCap, AlertCircle, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Category { id: string; name: string }
interface Props { categories: Category[]; companyId?: string | null }

export function AddCourseModal({ categories, companyId }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [title, setTitle]     = useState('');
  const [category, setCategory] = useState('');

  const close = () => { setOpen(false); setError(''); setTitle(''); setCategory(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('სახელი სავალდებულოა.'); return; }
    setLoading(true); setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('სესია ამოიწურა.'); setLoading(false); return; }

    const { data, error: dbErr } = await supabase
      .from('courses')
      .insert({
        title:                      title.trim(),
        category:                   category || null,
        status:                     'draft',
        company_id:                 companyId ?? null,
        created_by:                 user.id,
        estimated_duration_minutes: 0,
      })
      .select('id')
      .single();

    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    close();
    router.push(`/dashboard/learning/courses/${data.id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
      >
        <Plus size={15} />კურსის დამატება
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={17} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">ახალი კურსი</h2>
                <p className="text-xs text-gray-400">შეიქმნება Draft სტატუსით — კონტენტს შემდეგ დაამატებთ</p>
              </div>
              <button onClick={close} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form id="add-course-form" onSubmit={submit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  კურსის სახელი <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="მაგ: ISO 27001 – ინფორმაციის უსაფრთხოება"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-gray-400" />კატეგორია
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">— კატეგორია არ არის —</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} className="flex-shrink-0" />{error}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                გაუქმება
              </button>
              <button type="submit" form="add-course-form" disabled={loading}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {loading ? 'იქმნება...' : 'შექმნა და გახსნა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
