'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props { courseId: string; currentStatus: string }

export function PublishButton({ courseId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const isDraft = currentStatus !== 'published';

  const toggle = async () => {
    setLoading(true); setError('');
    const newStatus = isDraft ? 'published' : 'draft';
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from('courses')
      .update({
        status:       newStatus,
        ...(newStatus === 'published' ? { published_at: new Date().toISOString() } : {}),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', courseId);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-300">
          <AlertCircle size={12} />{error}
        </span>
      )}
      <button
        onClick={toggle}
        disabled={loading}
        className={[
          'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-50',
          isDraft
            ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm border border-white/60'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20',
        ].join(' ')}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : isDraft ? (
          <Globe size={15} />
        ) : (
          <FileText size={15} />
        )}
        {loading ? 'მიმდინარეობს...' : isDraft ? 'გამოქვეყნება' : 'Draft-ად დაბრუნება'}
      </button>
    </div>
  );
}
