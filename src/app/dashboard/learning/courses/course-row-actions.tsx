'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Archive, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Course { id: string; title: string; status: string }
interface Props { course: Course; categories: { id: string; name: string }[] }

export function CourseRowActions({ course }: Props) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

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
      {/* Edit — navigates to the full course builder */}
      <Link
        href={`/dashboard/learning/courses/${course.id}`}
        title="კურსის რედაქტირება"
        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        <Pencil size={15} />
      </Link>

      {/* Archive */}
      {course.status !== 'archived' && (
        <button
          onClick={() => { setError(''); setArchiveOpen(true); }}
          title="არქივი"
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <Archive size={15} />
        </button>
      )}

      {/* Archive confirm dialog */}
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
              <button
                onClick={() => setArchiveOpen(false)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={handleArchive}
                disabled={loading}
                className="flex-1 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
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
