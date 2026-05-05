'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { Plus, Globe, MoreVertical, Eye, Pencil, PowerOff, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tenant } from '@/types';

/* ── Create Tenant ───────────────────────────────────────────────────── */

export function CreateTenantButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', domain: '', adminFullName: '', adminEmail: '' });
  const { toasts, toast } = useToast();

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
    if (!res.ok) { setError(data.error ?? 'Failed to create tenant'); return; }
    setOpen(false);
    setForm({ name: '', slug: '', domain: '', adminFullName: '', adminEmail: '' });
    toast('Tenant created successfully');
    router.refresh();
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Create Tenant</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create Tenant">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tenant Details</p>
            <div className="space-y-3">
              <Input label="Tenant Name" required value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Acme Corporation" />
              <div>
                <Input
                  label="Slug" required value={form.slug}
                  onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="acme"
                />
                {form.slug && (
                  <p className="mt-1 text-xs text-indigo-500 flex items-center gap-1">
                    <Globe size={11} /> {form.slug}.hrapp.org
                  </p>
                )}
              </div>
              <Input label="Custom Domain (optional)" value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="hr.acme.com" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tenant Admin</p>
            <div className="space-y-3">
              <Input label="Admin Full Name" value={form.adminFullName} onChange={e => setForm(p => ({ ...p, adminFullName: e.target.value }))} placeholder="Jane Smith" />
              <Input label="Admin Email" type="email" required value={form.adminEmail} onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))} placeholder="jane@acme.com" />
              <p className="text-xs text-gray-400">An invite email will be sent to the admin.</p>
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

/* ── Tenant Row Actions ──────────────────────────────────────────────── */

export function TenantRowActions({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain ?? '',
    is_active: tenant.is_active,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    setLoading(true);
    const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    return { ok: res.ok, data };
  };

  const handleToggleActive = async () => {
    setMenuOpen(false);
    const { ok, data } = await patch({ is_active: !tenant.is_active });
    if (ok) { toast(`Tenant ${tenant.is_active ? 'deactivated' : 'activated'}`); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await patch(form);
    if (ok) { setEditOpen(false); toast('Tenant updated'); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <a
              href={`/dashboard/platform/tenants/${tenant.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <Eye size={14} /> View / Manage
            </a>
            <button
              onClick={() => { setMenuOpen(false); setEditOpen(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <Pencil size={14} /> Edit
            </button>
            <div className="h-px bg-gray-100 mx-2" />
            <button
              onClick={handleToggleActive}
              disabled={loading}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors disabled:opacity-50',
                tenant.is_active
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              )}
            >
              {tenant.is_active ? <><PowerOff size={14} /> Deactivate</> : <><Power size={14} /> Activate</>}
            </button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Tenant">
        <form onSubmit={handleEdit} className="p-6 space-y-4">
          <Input
            label="Tenant Name" required value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <div>
            <Input
              label="Slug" required value={form.slug}
              onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            />
            {form.slug && (
              <p className="mt-1 text-xs text-indigo-500 flex items-center gap-1">
                <Globe size={11} /> {form.slug}.hrapp.org
              </p>
            )}
          </div>
          <Input
            label="Custom Domain" value={form.domain}
            onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
            placeholder="hr.acme.com"
          />
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
