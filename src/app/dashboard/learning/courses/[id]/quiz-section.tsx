'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, Plus, Trash2, Clock, Target, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  quiz_questions?: [{ count: number }];
}

interface Props {
  quizzes: Quiz[];
  courseId: string;
  canManage: boolean;
}

const QUIZ_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-indigo-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
];

export function QuizSection({ quizzes, courseId, canManage }: Props) {
  const router   = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', passing_score: 70, max_attempts: 3, time_limit_minutes: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const supabase = createClient();
    const { error: dbErr } = await supabase.from('quizzes').insert({
      course_id:          courseId,
      title:              form.title.trim(),
      passing_score:      Number(form.passing_score),
      max_attempts:       Number(form.max_attempts),
      time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
    });
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setOpen(false);
    setForm({ title: '', passing_score: 70, max_attempts: 3, time_limit_minutes: '' });
    router.refresh();
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm('კითხვარის წაშლა?')) return;
    setDeleting(quizId);
    const supabase = createClient();
    await supabase.from('quizzes').delete().eq('id', quizId);
    router.refresh();
    setDeleting(null);
  };

  return (
    <div>
      {/* Header */}
      {canManage && (
        <div className="flex justify-end mb-5">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />კითხვარის დამატება
          </button>
        </div>
      )}

      {/* Empty */}
      {quizzes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
            <HelpCircle size={22} className="text-purple-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">კითხვარები არ არის</p>
          <p className="text-xs text-gray-400 mt-1">შექმენით პირველი კითხვარი</p>
        </div>
      )}

      {/* Quiz cards */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quizzes.map((quiz, i) => {
            const qCount = quiz.quiz_questions?.[0]?.count ?? 0;
            const grad   = QUIZ_COLORS[i % QUIZ_COLORS.length];
            return (
              <div key={quiz.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* Color strip */}
                <div className={`h-1.5 bg-gradient-to-r ${grad}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <HelpCircle size={17} className="text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{quiz.title}</h4>
                        <p className="text-xs text-gray-400">{qCount} კითხვა</p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        disabled={deleting === quiz.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { icon: Target,     label: 'გამსვლელი', value: `${quiz.passing_score}%` },
                      { icon: RefreshCw,  label: 'მცდელობა',  value: quiz.max_attempts ? `${quiz.max_attempts}x` : '∞' },
                      { icon: Clock,      label: 'ლიმიტი',    value: quiz.time_limit_minutes ? `${quiz.time_limit_minutes}წთ` : '—' },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <Icon size={13} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-900">{value}</p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Manage questions link */}
                  <Link
                    href={`/dashboard/learning/courses/${courseId}/quizzes/${quiz.id}`}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors"
                  >
                    <span>{qCount > 0 ? `${qCount} კითხვა — მართვა` : 'კითხვების დამატება'}</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <HelpCircle size={17} className="text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">ახალი კითხვარი</h2>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  სათაური <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="მაგ: საბოლოო შეფასება"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">გამსვლელი ქულა (%)</label>
                  <input type="number" min={0} max={100}
                    value={form.passing_score}
                    onChange={e => setForm(p => ({ ...p, passing_score: parseInt(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">მაქს. მცდელობა</label>
                  <input type="number" min={1}
                    value={form.max_attempts}
                    onChange={e => setForm(p => ({ ...p, max_attempts: parseInt(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  დროის ლიმიტი (წთ, არასავალდებულო)
                </label>
                <input type="number" min={1}
                  value={form.time_limit_minutes}
                  onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))}
                  placeholder="შეუზღუდავი"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  გაუქმება
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {loading ? 'ინახება...' : 'შექმნა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
