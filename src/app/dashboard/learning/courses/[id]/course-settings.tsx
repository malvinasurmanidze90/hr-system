'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil, Save, X, BarChart2, Clock, Target, ShieldCheck,
  AlignLeft, Tag, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  estimated_duration_minutes: number | null;
  passing_score: number | null;
  is_mandatory: boolean | null;
}
interface Category { id: string; name: string }

interface Props {
  course: Course;
  categories: Category[];
  canManage: boolean;
}

const DIFF_OPTIONS = [
  { value: 'beginner',     label: 'დამწყები',  color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'intermediate', label: 'საშუალო',   color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'advanced',     label: 'მოწინავე',  color: 'border-rose-400 bg-rose-50 text-rose-700' },
];
const DIFF_LABEL: Record<string, string> = {
  beginner: 'დამწყები', intermediate: 'საშუალო', advanced: 'მოწინავე',
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export function CourseSettings({ course, categories, canManage }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    title:                      course.title,
    description:                course.description ?? '',
    category:                   course.category ?? '',
    difficulty:                 course.difficulty ?? 'beginner',
    estimated_duration_minutes: course.estimated_duration_minutes ?? 0,
    passing_score:              course.passing_score ?? 70,
    is_mandatory:               course.is_mandatory ?? false,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true); setError('');
    const sb = createClient();
    const { error: dbErr } = await sb.from('courses').update({
      title:                      form.title.trim(),
      description:                form.description.trim() || null,
      category:                   form.category || null,
      difficulty:                 form.difficulty,
      estimated_duration_minutes: form.estimated_duration_minutes,
      passing_score:              form.passing_score,
      is_mandatory:               form.is_mandatory,
      updated_at:                 new Date().toISOString(),
    }).eq('id', course.id);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setForm({
      title:                      course.title,
      description:                course.description ?? '',
      category:                   course.category ?? '',
      difficulty:                 course.difficulty ?? 'beginner',
      estimated_duration_minutes: course.estimated_duration_minutes ?? 0,
      passing_score:              course.passing_score ?? 70,
      is_mandatory:               course.is_mandatory ?? false,
    });
    setError('');
    setEditing(false);
  };

  /* ── Read mode ─────────────────────────────────────────────────── */
  if (!editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">კურსის პარამეტრები</h3>
          {canManage && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <Pencil size={13} />რედაქტირება
            </button>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <AlignLeft size={11} />აღწერა
          </p>
          {course.description ? (
            <p className="text-sm text-gray-700 leading-relaxed">{course.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">აღწერა არ არის დამატებული.</p>
          )}
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: BarChart2,  label: 'სირთულე',      val: DIFF_LABEL[course.difficulty ?? ''] ?? course.difficulty ?? '—' },
            { icon: Clock,      label: 'ხანგრძლივობა', val: formatDuration(course.estimated_duration_minutes ?? 0) },
            { icon: Target,     label: 'გამსვლელი',    val: `${course.passing_score ?? 70}%` },
            { icon: Tag,        label: 'კატეგორია',    val: course.category ?? '—' },
            { icon: ShieldCheck,label: 'სავალდებულო',  val: course.is_mandatory ? 'დიახ' : 'არა' },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon size={14} className="text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Edit mode ─────────────────────────────────────────────────── */
  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">კურსის პარამეტრები</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={cancel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <X size={13} />გაუქმება
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? <Spinner /> : <Save size={13} />}
            {loading ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          სათაური <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <span className="flex items-center gap-1.5"><AlignLeft size={13} className="text-gray-400" />აღწერა</span>
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="კურსის მოკლე აღწერა..."
          className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Category + Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Tag size={13} className="text-gray-400" />კატეგორია</span>
          </label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">— კატეგორია არ არის —</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">სირთულე</label>
          <div className="flex gap-2">
            {DIFF_OPTIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, difficulty: d.value }))}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                  form.difficulty === d.value ? d.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Duration + Passing score */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />ხანგრძლივობა (წთ)</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.estimated_duration_minutes}
            onChange={e => setForm(p => ({ ...p, estimated_duration_minutes: parseInt(e.target.value) || 0 }))}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Target size={13} className="text-gray-400" />გამსვლელი (%)</span>
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.passing_score}
            onChange={e => setForm(p => ({ ...p, passing_score: parseInt(e.target.value) || 0 }))}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Mandatory toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-gray-400" />სავალდებულო კურსი</span>
        </label>
        <div className="flex gap-3">
          {[
            { val: false, label: 'სურვილისამებრ', desc: 'თანამშრომელი ირჩევს' },
            { val: true,  label: 'სავალდებულო',   desc: 'ყველა უნდა გაიაროს' },
          ].map(opt => (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => setForm(p => ({ ...p, is_mandatory: opt.val }))}
              className={`flex-1 text-left p-3.5 rounded-xl border-2 transition-all ${
                form.is_mandatory === opt.val
                  ? opt.val
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className={`text-sm font-semibold mb-0.5 ${
                form.is_mandatory === opt.val ? (opt.val ? 'text-rose-700' : 'text-indigo-700') : 'text-gray-700'
              }`}>{opt.label}</p>
              <p className={`text-xs ${
                form.is_mandatory === opt.val ? (opt.val ? 'text-rose-500' : 'text-indigo-500') : 'text-gray-400'
              }`}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={13} />{error}
        </div>
      )}
    </form>
  );
}
