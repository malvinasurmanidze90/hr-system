'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function CompanyActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', industry: '', size_range: '' });

  const handleNameChange = (name: string) => {
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(p => ({ ...p, name, slug: autoSlug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('companies').insert({
      name: form.name,
      slug: form.slug || null,
      industry: form.industry || null,
      size_range: form.size_range || null,
    });
    setLoading(false);
    setOpen(false);
    setForm({ name: '', slug: '', industry: '', size_range: '' });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Add Company
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Company">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Company Name"
            required
            value={form.name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
          />
          <div>
            <Input
              label="Subdomain Slug"
              value={form.slug}
              onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="acme"
            />
            {form.slug && (
              <p className="mt-1 text-xs text-indigo-500 flex items-center gap-1">
                <Globe size={11} /> {form.slug}.hrapp.org
              </p>
            )}
          </div>
          <Input label="Industry" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Technology" />
          <Input label="Company Size" value={form.size_range} onChange={e => setForm(p => ({ ...p, size_range: e.target.value }))} placeholder="100-500" />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Company</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
