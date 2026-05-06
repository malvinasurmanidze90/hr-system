'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Tag, AlertCircle, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Category { id: string; name: string }
interface Props { categories: Category[]; companyId?: string | null }

export function CourseNewForm({ categories, companyId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [title, setTitle]     = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]   = useState<'draft' | 'published'>('draft');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('სახელი სავალდებულოა.'); return; }
    setLoading(true); setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('სესია ამოიწურა. განაახლეთ გვერდი.'); setLoading(false); return; }

    const { data: inserted, error: dbErr } = await supabase
      .from('courses')
      .insert({
        title:                      title.trim(),
        category:                   category || null,
        status,
        company_id:                 companyId ?? null,
        created_by:                 user.id,
        estimated_duration_minutes: 0,
      })
      .select('id')
      .single();

    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    router.push(`/dashboard/learning/courses/${inserted?.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors mb-6 group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            კურსების სია
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ახალი კურსი</h1>
              <p className="text-indigo-200 text-sm">კონტენტს კურსის builder-ში დაამატებთ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 space-y-4">

              {/* Title */}
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
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-gray-400" />კატეგორია
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                >
                  <option value="">— კატეგორია არ არის —</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">სტატუსი</label>
                <div className="flex gap-3">
                  {([
                    { value: 'draft',     label: 'Draft',           desc: 'ჯერ არ არის გამოქვეყნებული',      color: 'border-gray-400 bg-gray-50 text-gray-700' },
                    { value: 'published', label: 'გამოქვეყნებული', desc: 'ხელმისაწვდომია თანამშრომლებისთვის', color: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
                  ] as const).map(opt => {
                    const active = status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        className={[
                          'flex-1 text-left p-4 rounded-xl border-2 transition-all',
                          active ? `${opt.color} shadow-sm` : 'border-gray-200 hover:border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        <p className={`text-sm font-semibold mb-0.5 ${active ? '' : 'text-gray-700'}`}>{opt.label}</p>
                        <p className={`text-xs ${active ? 'opacity-80' : 'text-gray-400'}`}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
              <AlertCircle size={15} className="flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <Save size={15} />}
              {loading ? 'ინახება...' : 'შექმნა და გახსნა'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
