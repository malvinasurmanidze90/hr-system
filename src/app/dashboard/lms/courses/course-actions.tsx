'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  estimated_duration_minutes: number;
  passing_score: number;
  status: string;
}

/* ─── Edit ───────────────────────────────────────────────────────────── */
export function EditCourseButton({ course }: { course: Course }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? '',
    category: course.category ?? '',
    difficulty: course.difficulty,
    estimated_duration_minutes: course.estimated_duration_minutes,
    passing_score: course.passing_score,
    status: course.status,
  });

  const f = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const handleClose = () => { setOpen(false); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('სათაური სავალდებულოა.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from('courses')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        difficulty: form.difficulty,
        estimated_duration_minutes: Number(form.estimated_duration_minutes),
        passing_score: Number(form.passing_score),
        status: form.status,
      })
      .eq('id', course.id);
    setLoading(false);
    if (dbError) { setError(dbError.message); return; }
    handleClose();
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        title="რედაქტირება"
      >
        <Pencil size={15} />
      </button>

      <Dialog open={open} onClose={handleClose} title="კურსის რედაქტირება" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="სათაური *" value={form.title} onChange={f('title')} autoFocus />
          <Textarea label="აღწერა" rows={3} value={form.description} onChange={f('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="კატეგორია" value={form.category} onChange={f('category')} placeholder="მაგ: Compliance" />
            <Select label="სირთულე" value={form.difficulty} onChange={f('difficulty')}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ხანგრძლივობა (წთ)" type="number" min={1} value={form.estimated_duration_minutes} onChange={f('estimated_duration_minutes')} />
            <Input label="გამსვლელი ქულა (%)" type="number" min={0} max={100} value={form.passing_score} onChange={f('passing_score')} />
          </div>
          <Select label="სტატუსი" value={form.status} onChange={f('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>გაუქმება</Button>
            <Button type="submit" loading={loading}>შენახვა</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* ─── Delete ─────────────────────────────────────────────────────────── */
export function DeleteCourseButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase.from('courses').delete().eq('id', id);
    setLoading(false);
    if (dbError) { setError(dbError.message); return; }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="წაშლა"
      >
        <Trash2 size={15} />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="კურსის წაშლა" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            დარწმუნებული ხარ, რომ გსურს კურსის{' '}
            <span className="font-semibold text-gray-900">„{title}"</span> წაშლა?
            ეს მოქმედება შეუქცევადია.
          </p>
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>გაუქმება</Button>
            <Button type="button" variant="danger" loading={loading} onClick={handleDelete}>წაშლა</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
