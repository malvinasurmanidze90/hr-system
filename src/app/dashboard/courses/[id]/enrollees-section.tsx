'use client';
import { useState, useEffect } from 'react';
import { UserPlus, Calendar, AlertCircle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getInitials, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'არ დაწყებულა',
  in_progress: 'მიმდინარე',
  completed:   'დასრულებული',
  overdue:     'ვადაგადაცილებული',
};
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

export function EnrolleesSection({ courseId }: { courseId: string }) {
  const router  = useRouter();
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState('');
  const [users, setUsers]       = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<any[]>([]);
  const [form, setForm]         = useState({ user_id: '', due_date: '' });

  const load = async () => {
    setFetching(true);
    const supabase = createClient();
    const [{ data: u }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('status', 'active').order('full_name'),
      supabase.from('course_enrollments')
        .select('*, user:profiles(full_name, email)')
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false }),
    ]);
    setUsers(u ?? []);
    setEnrolled(e ?? []);
    setFetching(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id) { setError('მომხმარებელი სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from('course_enrollments').upsert({
      course_id:  courseId,
      user_id:    form.user_id,
      assigned_by: user?.id,
      due_date:   form.due_date || null,
      status:     'not_started',
    }, { onConflict: 'course_id,user_id' });
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setOpen(false);
    setForm({ user_id: '', due_date: '' });
    await load();
    router.refresh();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{enrolled.length} რეგისტრანტი</p>
        <button
          onClick={() => { setError(''); setOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={15} />
          რეგისტრაცია
        </button>
      </div>

      {/* Empty */}
      {!fetching && enrolled.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Users size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">რეგისტრანტები არ არის</p>
          <p className="text-xs text-gray-400 mt-1">დაარეგისტრირეთ პირველი თანამშრომელი</p>
        </div>
      )}

      {/* Enrollee list */}
      {enrolled.length > 0 && (
        <div className="space-y-2">
          {enrolled.map((e: any, i: number) => {
            const name    = e.user?.full_name ?? 'Unknown';
            const avatarC = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const pct     = e.progress_percentage ?? 0;

            return (
              <div key={e.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100/70 transition-colors">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarC}`}>
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{e.user?.email}</p>
                </div>

                {/* Progress bar */}
                <div className="hidden sm:block w-24">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>პროგ.</span><span>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Due date */}
                {e.due_date && (
                  <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Calendar size={11} />{formatDate(e.due_date)}
                  </span>
                )}

                {/* Status */}
                <StatusBadge status={e.status} />
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <UserPlus size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">კურსზე რეგისტრაცია</h2>
            </div>

            <form onSubmit={handleEnroll} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  თანამშრომელი <span className="text-red-400">*</span>
                </label>
                <select
                  required value={form.user_id}
                  onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">— თანამშრომლის არჩევა —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ბოლო ვადა (არასავალდებულო)
                </label>
                <input type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
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
                  {loading ? 'მიმდინარე...' : 'დარეგისტრირება'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
