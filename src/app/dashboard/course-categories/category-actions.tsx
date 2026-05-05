'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';

type FormState = { name: string; description: string; status: string };
const EMPTY: FormState = { name: '', description: '', status: 'active' };

/* ─── Create ─────────────────────────────────────────────────────────── */
export function CategoryActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const handleClose = () => { setOpen(false); setError(''); setForm(EMPTY); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('სახელი სავალდებულოა.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from('course_categories')
      .insert({ name: form.name.trim(), description: form.description.trim() || null, status: form.status });
    setLoading(false);
    if (dbError) { setError(dbError.message); return; }
    handleClose();
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        კატეგორიის დამატება
      </Button>

      <Dialog open={open} onClose={handleClose} title="ახალი კატეგორია">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="სახელი *" placeholder="მაგ: ლიდერობა" value={form.name} onChange={set('name')} autoFocus />
          <Textarea label="აღწერა" placeholder="მოკლე აღწერა (არასავალდებულო)" rows={3} value={form.description} onChange={set('description')} />
          <Select label="სტატუსი" value={form.status} onChange={set('status')}>
            <option value="active">აქტიური</option>
            <option value="inactive">არააქტიური</option>
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

/* ─── Edit ───────────────────────────────────────────────────────────── */
interface Category {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export function EditCategoryButton({ category }: { category: Category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    name: category.name,
    description: category.description ?? '',
    status: category.status ?? 'active',
  });

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const handleClose = () => { setOpen(false); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('სახელი სავალდებულოა.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from('course_categories')
      .update({ name: form.name.trim(), description: form.description.trim() || null, status: form.status })
      .eq('id', category.id);
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

      <Dialog open={open} onClose={handleClose} title="კატეგორიის რედაქტირება">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="სახელი *" value={form.name} onChange={set('name')} autoFocus />
          <Textarea label="აღწერა" rows={3} value={form.description} onChange={set('description')} />
          <Select label="სტატუსი" value={form.status} onChange={set('status')}>
            <option value="active">აქტიური</option>
            <option value="inactive">არააქტიური</option>
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
export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase.from('course_categories').delete().eq('id', id);
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

      <Dialog open={open} onClose={() => setOpen(false)} title="კატეგორიის წაშლა" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            დარწმუნებული ხარ, რომ გსურს კატეგორიის{' '}
            <span className="font-semibold text-gray-900">„{name}"</span> წაშლა?
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
