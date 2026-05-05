'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Globe } from 'lucide-react';

export function CreateTenantButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    domain: '',
    adminFullName: '',
    adminEmail: '',
  });

  const handleNameChange = (name: string) => {
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(p => ({ ...p, name, slug: autoSlug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/platform/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to create tenant');
      return;
    }

    setOpen(false);
    setForm({ name: '', slug: '', domain: '', adminFullName: '', adminEmail: '' });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Create Tenant
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Create Tenant">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tenant Details</p>
            <div className="space-y-3">
              <Input
                label="Tenant Name"
                required
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Acme Corporation"
              />
              <div>
                <Input
                  label="Slug"
                  required
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
              <Input
                label="Custom Domain (optional)"
                value={form.domain}
                onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                placeholder="hr.acme.com"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tenant Admin</p>
            <div className="space-y-3">
              <Input
                label="Admin Full Name"
                value={form.adminFullName}
                onChange={e => setForm(p => ({ ...p, adminFullName: e.target.value }))}
                placeholder="Jane Smith"
              />
              <Input
                label="Admin Email"
                type="email"
                required
                value={form.adminEmail}
                onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))}
                placeholder="jane@acme.com"
              />
              <p className="text-xs text-gray-400">
                An invite email will be sent to the admin. They will be assigned the Tenant Admin role.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Tenant</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
