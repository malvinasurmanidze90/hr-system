'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props { companies: { id: string; name: string }[] }

export function BusinessUnitActions({ companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', company_id: companies[0]?.id ?? '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('business_units').insert(form);
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Business Unit</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Business Unit">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Select label="Company" required value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Engineering" />
          <Input label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="ENG" />
          <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
