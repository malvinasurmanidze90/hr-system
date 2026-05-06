'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Pencil, Trash2, CheckSquare, AlignLeft, ToggleLeft,
  HelpCircle, AlertCircle, GripVertical, Check, X,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */
type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  question_type: QuestionType;
  options: string[] | null;
  correct_answer: string | string[];
  explanation: string | null;
  points: number;
  sort_order: number;
}

interface Props {
  quizId: string;
  initialQuestions: Question[];
  canManage: boolean;
}

/* ── Config ─────────────────────────────────────────────────────────── */
const QTYPES: { value: QuestionType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'multiple_choice', label: 'მრავალარჩევანი', icon: CheckSquare, desc: 'ერთი ან მეტი სწორი პასუხი' },
  { value: 'true_false',      label: 'სწორი/მცდარი',  icon: ToggleLeft,  desc: 'ორი ვარიანტი' },
  { value: 'short_answer',    label: 'მოკლე პასუხი',  icon: AlignLeft,   desc: 'ტექსტური პასუხი' },
];
function qtypeConf(t: QuestionType) { return QTYPES.find(x => x.value === t) ?? QTYPES[0]; }

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Default form ────────────────────────────────────────────────────── */
const BLANK = {
  question: '',
  question_type: 'multiple_choice' as QuestionType,
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: '',
  points: 1,
};

/* ── Component ──────────────────────────────────────────────────────── */
export function QuizEditor({ quizId, initialQuestions, canManage }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selected, setSelected]   = useState<Question | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [deleting, setDeleting]   = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit' }>({ open: false, mode: 'add' });
  const [form, setForm]   = useState(BLANK);

  /* ── Reload ────────────────────────────────────────────────────────── */
  const reload = async () => {
    const sb = createClient();
    const { data } = await sb.from('quiz_questions').select('*').eq('quiz_id', quizId).order('sort_order');
    if (data) setQuestions(data as Question[]);
  };

  /* ── Open modals ───────────────────────────────────────────────────── */
  const openAdd = () => {
    setForm(BLANK);
    setError('');
    setModal({ open: true, mode: 'add' });
  };
  const openEdit = (q: Question) => {
    setForm({
      question:      q.question,
      question_type: q.question_type,
      options:       q.options?.length ? [...q.options] : ['', '', '', ''],
      correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer[0] ?? '' : (q.correct_answer as string) ?? '',
      explanation:   q.explanation ?? '',
      points:        q.points,
    });
    setError('');
    setModal({ open: true, mode: 'edit' });
  };

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const updateOption = (idx: number, val: string) => {
    setForm(p => {
      const opts = [...p.options];
      opts[idx] = val;
      return { ...p, options: opts };
    });
  };
  const addOption = () => setForm(p => ({ ...p, options: [...p.options, ''] }));
  const removeOption = (idx: number) => setForm(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));

  /* ── Save ──────────────────────────────────────────────────────────── */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) { setError('კითხვა სავალდებულოა.'); return; }
    if (form.question_type === 'multiple_choice') {
      const filled = form.options.filter(o => o.trim());
      if (filled.length < 2) { setError('მინიმუმ 2 ვარიანტი საჭიროა.'); return; }
      if (!form.correct_answer.trim()) { setError('სწორი პასუხი სავალდებულოა.'); return; }
    }
    if (form.question_type === 'true_false' && !form.correct_answer) {
      setError('სწორი პასუხი სავალდებულოა.'); return;
    }

    setLoading(true); setError('');
    const sb = createClient();

    const payload = {
      quiz_id:        quizId,
      question:       form.question.trim(),
      question_type:  form.question_type,
      options:        form.question_type === 'multiple_choice' ? form.options.filter(o => o.trim()) : null,
      correct_answer: form.correct_answer,
      explanation:    form.explanation.trim() || null,
      points:         form.points,
    };

    if (modal.mode === 'add') {
      const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 1 : 0;
      const { data: ins, error: err } = await sb.from('quiz_questions')
        .insert({ ...payload, sort_order: nextOrder })
        .select().single();
      setLoading(false);
      if (err) { setError(err.message); return; }
      setModal({ open: false, mode: 'add' });
      const newQ = ins as Question;
      setQuestions(prev => [...prev, newQ]);
      setSelected(newQ);
    } else {
      if (!selected) return;
      const { error: err } = await sb.from('quiz_questions')
        .update(payload)
        .eq('id', selected.id);
      setLoading(false);
      if (err) { setError(err.message); return; }
      setModal({ open: false, mode: 'add' });
      await reload();
      setSelected(prev => prev ? { ...prev, ...payload, id: prev.id, sort_order: prev.sort_order, quiz_id: prev.quiz_id } as Question : null);
    }
  };

  /* ── Delete ────────────────────────────────────────────────────────── */
  const deleteQ = async (qId: string) => {
    if (!confirm('კითხვის წაშლა?')) return;
    setDeleting(qId);
    const sb = createClient();
    await sb.from('quiz_questions').delete().eq('id', qId);
    setDeleting(null);
    setQuestions(prev => prev.filter(q => q.id !== qId));
    if (selected?.id === qId) setSelected(null);
  };

  /* ── Right panel ───────────────────────────────────────────────────── */
  const RightPanel = () => {
    if (!selected) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
            <HelpCircle size={28} className="text-violet-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">კითხვა არ არის არჩეული</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            აირჩიეთ კითხვა მარცხნივ ან დაამატეთ ახალი.
          </p>
        </div>
      );
    }

    const conf = qtypeConf(selected.question_type);
    const Icon = conf.icon;
    const opts = selected.options ?? [];
    const correctAns = Array.isArray(selected.correct_answer) ? selected.correct_answer[0] : selected.correct_answer;

    return (
      <div className="p-6 overflow-y-auto">
        {/* Question header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700 mb-3">
              <Icon size={11} />{conf.label}
            </span>
            <p className="text-base font-semibold text-gray-900 leading-snug">{selected.question}</p>
            <p className="text-xs text-gray-400 mt-1">{selected.points} ქულა</p>
          </div>
          {canManage && (
            <button
              onClick={() => openEdit(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0 shadow-sm"
            >
              <Pencil size={13} />რედ.
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-3">

          {/* Multiple choice */}
          {selected.question_type === 'multiple_choice' && opts.map((opt, i) => {
            const isCorrect = opt === correctAns;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                  {isCorrect && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-sm ${isCorrect ? 'font-semibold text-emerald-800' : 'text-gray-700'}`}>{opt}</span>
              </div>
            );
          })}

          {/* True / false */}
          {selected.question_type === 'true_false' && ['true', 'false'].map(v => {
            const isCorrect = v === String(correctAns);
            return (
              <div
                key={v}
                className={`flex items-center gap-3 p-3 rounded-xl border ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                  {isCorrect && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-sm ${isCorrect ? 'font-semibold text-emerald-800' : 'text-gray-700'}`}>
                  {v === 'true' ? 'სწორი' : 'მცდარი'}
                </span>
              </div>
            );
          })}

          {/* Short answer */}
          {selected.question_type === 'short_answer' && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">სწორი პასუხი</p>
              <p className="text-sm text-gray-800">{String(correctAns) || '—'}</p>
            </div>
          )}

          {/* Explanation */}
          {selected.explanation && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">განმარტება</p>
              <p className="text-sm text-amber-900 leading-relaxed">{selected.explanation}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ minHeight: 560 }}>

      {/* LEFT: question list */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/60">

        {/* Panel header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-700">{questions.length}</span> კითხვა
          </p>
          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <Plus size={11} />კითხვა
            </button>
          )}
        </div>

        {/* Empty */}
        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <HelpCircle size={22} className="text-violet-300" />
            </div>
            <p className="text-xs font-semibold text-gray-600 mb-1">კითხვები არ არის</p>
            <p className="text-[11px] text-gray-400">დაამატეთ პირველი კითხვა.</p>
            {canManage && (
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
              >
                <Plus size={12} />კითხვის დამატება
              </button>
            )}
          </div>
        )}

        {/* Question rows */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {questions.map((q, idx) => {
            const conf = qtypeConf(q.question_type);
            const Icon = conf.icon;
            const isSelected = selected?.id === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setSelected(q)}
                className={[
                  'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all',
                  isSelected
                    ? 'border-violet-300 bg-violet-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40',
                ].join(' ')}
              >
                <span className="w-5 h-5 rounded-md bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isSelected ? 'text-violet-800' : 'text-gray-800'}`}>
                    {q.question}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Icon size={9} />{conf.label} · {q.points}ქ.
                  </span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelected(q); openEdit(q); }}
                      className="p-1 rounded text-gray-400 hover:text-violet-600 hover:bg-violet-100 transition-colors"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => deleteQ(q.id)}
                      disabled={deleting === q.id}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: question preview */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <RightPanel />
      </div>

      {/* ── Question modal ─────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ open: false, mode: 'add' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <HelpCircle size={16} className="text-violet-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === 'add' ? 'ახალი კითხვა' : 'კითხვის რედაქტირება'}
              </h2>
            </div>

            {/* Modal form */}
            <form id="q-form" onSubmit={save} className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Question type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ტიპი</label>
                <div className="grid grid-cols-3 gap-2">
                  {QTYPES.map(qt => {
                    const Icon = qt.icon;
                    const active = form.question_type === qt.value;
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          question_type: qt.value,
                          correct_answer: qt.value === 'true_false' ? 'true' : '',
                          options: qt.value === 'multiple_choice' ? (p.options.length >= 2 ? p.options : ['', '', '', '']) : [],
                        }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                          active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[11px] font-medium leading-tight">{qt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  კითხვა <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.question}
                  onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  placeholder="შეიყვანეთ კითხვა..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Multiple choice options */}
              {form.question_type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ვარიანტები <span className="text-gray-400 font-normal">(მინ. 2)</span>
                  </label>
                  <div className="space-y-2">
                    {form.options.map((opt, idx) => {
                      const isCorrect = opt.trim() !== '' && opt === form.correct_answer;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => opt.trim() && setForm(p => ({ ...p, correct_answer: opt }))}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                            }`}
                            title="სწორი პასუხი"
                          >
                            {isCorrect && <Check size={11} className="text-white" />}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => updateOption(idx, e.target.value)}
                            placeholder={`ვარიანტი ${idx + 1}`}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                          {form.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {form.options.length < 8 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-1"
                      >
                        <Plus size={12} />ვარიანტის დამატება
                      </button>
                    )}
                  </div>
                  {form.correct_answer && (
                    <p className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1">
                      <Check size={10} />სწორია: {form.correct_answer}
                    </p>
                  )}
                </div>
              )}

              {/* True / false */}
              {form.question_type === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">სწორი პასუხი</label>
                  <div className="flex gap-3">
                    {[
                      { val: 'true',  label: 'სწორი' },
                      { val: 'false', label: 'მცდარი' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, correct_answer: val }))}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                          form.correct_answer === val
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Short answer */}
              {form.question_type === 'short_answer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    სწორი პასუხი <span className="text-gray-400 font-normal">(კლავდება)</span>
                  </label>
                  <input
                    type="text"
                    value={form.correct_answer}
                    onChange={e => setForm(p => ({ ...p, correct_answer: e.target.value }))}
                    placeholder="მოსალოდნელი პასუხი..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  განმარტება <span className="text-gray-400 font-normal">(არასავალდებულო)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.explanation}
                  onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))}
                  placeholder="პასუხის განმარტება, რომელიც გამოჩნდება შეფასების შემდეგ..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ქულები</label>
                <input
                  type="number"
                  min={1}
                  value={form.points}
                  onChange={e => setForm(p => ({ ...p, points: parseInt(e.target.value) || 1 }))}
                  className="w-28 px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />{error}
                </div>
              )}
            </form>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModal({ open: false, mode: 'add' })}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                form="q-form"
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                {loading ? 'ინახება...' : modal.mode === 'add' ? 'შექმნა' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
