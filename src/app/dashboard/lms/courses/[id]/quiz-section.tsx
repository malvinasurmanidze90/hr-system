'use client';
import { useState } from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  quizzes: any[];
  courseId: string;
  canManage: boolean;
}

export function QuizSection({ quizzes, courseId, canManage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', passing_score: 70, max_attempts: 3, time_limit_minutes: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('quizzes').insert({
      course_id: courseId,
      title: form.title,
      passing_score: form.passing_score,
      max_attempts: form.max_attempts,
      time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm('Delete this quiz and all its questions?')) return;
    const supabase = createClient();
    await supabase.from('quizzes').delete().eq('id', quizId);
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quizzes ({quizzes.length})</CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={14} /> Add Quiz
              </Button>
            )}
          </div>
        </CardHeader>
        {quizzes.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {quizzes.map((quiz: any) => (
              <li key={quiz.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group">
                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={14} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{quiz.title}</p>
                  <p className="text-xs text-gray-400">
                    {quiz.quiz_questions?.[0]?.count ?? 0} questions · Pass: {quiz.passing_score}%
                    {quiz.max_attempts && ` · ${quiz.max_attempts} attempts`}
                  </p>
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(quiz.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <CardContent className="py-8 text-center text-sm text-gray-400">No quizzes yet.</CardContent>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Quiz">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <Input label="Quiz Title" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Passing Score (%)" type="number" min={0} max={100} value={form.passing_score} onChange={e => setForm(p => ({ ...p, passing_score: parseInt(e.target.value) }))} />
            <Input label="Max Attempts" type="number" min={1} value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: parseInt(e.target.value) }))} />
          </div>
          <Input label="Time Limit (minutes, optional)" type="number" min={1} value={form.time_limit_minutes} onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Quiz</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
