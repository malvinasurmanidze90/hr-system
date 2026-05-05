'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, GraduationCap, Clock, Tag, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface Category { id: string; name: string }
interface Props { categories: Category[]; companyId?: string | null }

const EMPTY = {
  title: '',
  description: '',
  category: '',
  duration_minutes: 30,
  is_mandatory: false,
  status: 'draft' as 'draft' | 'published',
};

/* ── Toggle ────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        checked ? 'bg-indigo-600' : 'bg-gray-200',
      ].join(' ')}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

/* ── StatusCard ────────────────────────────────────────────────────── */
function StatusCard({
  value, current, label, desc, color, onClick,
}: {
  value: string; current: string; label: string; desc: string;
  color: string; onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 text-left p-4 rounded-xl border-2 transition-all',
        active ? `${color} shadow-sm` : 'border-gray-200 hover:border-gray-300 bg-white',
      ].join(' ')}
    >
      <p className={`text-sm font-semibold mb-0.5 ${active ? '' : 'text-gray-700'}`}>{label}</p>
      <p className={`text-xs ${active ? 'opacity-80' : 'text-gray-400'}`}>{desc}</p>
    </button>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export function CreateCourseButton({ categories, companyId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const set = <K extends keyof typeof EMPTY>(key: K, value: typeof EMPTY[K]) =>
    setForm(p => ({ ...p, [key]: value }));

  const handleClose = () => { setOpen(false); setError(''); setForm(EMPTY); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    if (form.duration_minutes < 1) { setError('ხანგრძლივობა უნდა იყოს მინიმუმ 1 წუთი.'); return; }

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('სესია ამოიწურა. განაახლეთ გვერდი.'); setLoading(false); return; }

    const payload: Record<string, unknown> = {
      title:                      form.title.trim(),
      description:                form.description.trim() || null,
      category:                   form.category || null,
      estimated_duration_minutes: Number(form.duration_minutes),
      status:                     form.status,
      company_id:                 companyId ?? null,
      created_by:                 user.id,
    };

    // is_mandatory — include only if column exists (Supabase ignores unknown cols gracefully)
    payload.is_mandatory = form.is_mandatory;

    const { error: dbError } = await supabase.from('courses').insert(payload);

    setLoading(false);
    if (dbError) {
      // if column doesn't exist yet, retry without it
      if (dbError.message.includes('is_mandatory')) {
        delete payload.is_mandatory;
        const { error: retryError } = await supabase.from('courses').insert(payload);
        if (retryError) { setError(retryError.message); return; }
      } else {
        setError(dbError.message);
        return;
      }
    }

    handleClose();
    router.refresh();
  };

  const durationLabel = () => {
    const m = Number(form.duration_minutes);
    if (!m) return '';
    const h = Math.floor(m / 60), rem = m % 60;
    if (h === 0) return `${rem} წუთი`;
    return rem > 0 ? `${h} სთ ${rem} წთ` : `${h} საათი`;
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:-translate-y-0.5">
        <Plus size={16} />კურსის დამატება
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:-translate-y-0.5">
        <Plus size={16} />კურსის დამატება
      </button>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">ახალი კურსი</h2>
              <p className="text-xs text-gray-400">შეავსეთ ინფორმაცია კურსის შესახებ</p>
            </div>
            <button
              onClick={handleClose}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} id="create-course-form">

              {/* Section 1 — Basic info */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={12} /> ძირითადი ინფორმაცია
                </p>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    სათაური <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="მაგ: ISO 27001 – ინფორმაციის უსაფრთხოება"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    აღწერა
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="კურსის მიზნები, შინაარსი, სამიზნე აუდიტორია..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Tag size={13} className="text-gray-400" /> კატეგორია
                  </label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  >
                    <option value="">— კატეგორია არ არის —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-400" /> ხანგრძლივობა
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={form.duration_minutes}
                        onChange={e => set('duration_minutes', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 pr-12 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        წთ
                      </span>
                    </div>
                    {durationLabel() && (
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        = {durationLabel()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Section 2 — Settings */}
              <div className="px-6 py-5 space-y-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  პარამეტრები
                </p>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">სტატუსი</label>
                  <div className="flex gap-3">
                    <StatusCard
                      value="draft" current={form.status}
                      label="Draft" desc="ჯერ არ არის გამოქვეყნებული"
                      color="border-gray-400 bg-gray-50 text-gray-700"
                      onClick={() => set('status', 'draft')}
                    />
                    <StatusCard
                      value="published" current={form.status}
                      label="გამოქვეყნებული" desc="ხელმისაწვდომია თანამშრომლებისთვის"
                      color="border-indigo-500 bg-indigo-50 text-indigo-700"
                      onClick={() => set('status', 'published')}
                    />
                  </div>
                </div>

                {/* is_mandatory toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">სავალდებულო კურსი</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.is_mandatory
                        ? 'ყველა მითითებული თანამშრომლისთვის სავალდებულოა'
                        : 'სურვილისამებრ — თანამშრომელი თავად ირჩევს'}
                    </p>
                  </div>
                  <Toggle
                    checked={form.is_mandatory}
                    onChange={v => set('is_mandatory', v)}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 flex-1 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={13} className="flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                form="create-course-form"
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'ინახება...' : 'კურსის შენახვა'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
