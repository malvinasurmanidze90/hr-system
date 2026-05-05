'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/input';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { UserPlus, Link2, Unlink, Plus, Trash2, Globe, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Company { id: string; name: string; slug?: string; }

/* ── Assign Admin ────────────────────────────────────────────────────── */
export function AssignAdminButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/platform/tenants/${tenantId}/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, fullName: form.fullName }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ email: '', fullName: '' });
      toast('Admin assigned — invite sent if new user');
      router.refresh();
    } else {
      toast(data.error ?? 'Failed to assign admin', 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Button size="sm" onClick={() => setOpen(true)}><UserPlus size={14} /> Assign Admin</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Assign Tenant Admin">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Admin Email" type="email" required
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="admin@company.com"
          />
          <Input
            label="Full Name (optional)"
            value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            placeholder="Jane Smith"
          />
          <p className="text-xs text-gray-400">
            If this email is already registered, the role is added to the existing user.
            Otherwise an invite email will be sent.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Assign Admin</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* ── Remove Admin ────────────────────────────────────────────────────── */
export function RemoveAdminButton({ tenantId, userId, name }: { tenantId: string; userId: string; name: string }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm(`Remove ${name} as tenant admin?`)) return;
    setLoading(true);
    const res = await fetch(`/api/platform/tenants/${tenantId}/admins`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { toast('Admin removed'); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <button
        onClick={handleRemove}
        disabled={loading}
        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
        title="Remove admin"
      >
        <Trash2 size={14} />
      </button>
    </>
  );
}

/* ── Link Existing Company ───────────────────────────────────────────── */
export function LinkCompanyButton({ tenantId, available }: { tenantId: string; available: Company[] }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    const res = await fetch(`/api/platform/tenants/${tenantId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link', companyId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setOpen(false); setCompanyId(''); toast('Company linked'); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={available.length === 0}>
        <Link2 size={14} /> Link Company
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Link Existing Company">
        <form onSubmit={handleLink} className="p-6 space-y-4">
          <Select label="Select Company" required value={companyId} onChange={e => setCompanyId(e.target.value)}>
            <option value="">Choose a company…</option>
            {available.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.slug ? ` (${c.slug})` : ''}</option>
            ))}
          </Select>
          {available.length === 0 && (
            <p className="text-xs text-gray-400">No unlinked companies available.</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!companyId}>Link</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* ── Unlink Company ──────────────────────────────────────────────────── */
export function UnlinkCompanyButton({ tenantId, companyId, companyName }: { tenantId: string; companyId: string; companyName: string }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUnlink = async () => {
    if (!confirm(`Unlink "${companyName}" from this tenant?`)) return;
    setLoading(true);
    const res = await fetch(`/api/platform/tenants/${tenantId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlink', companyId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { toast('Company unlinked'); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <button
        onClick={handleUnlink}
        disabled={loading}
        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
        title="Unlink company"
      >
        <Unlink size={14} />
      </button>
    </>
  );
}

/* ── Module Toggle Section ───────────────────────────────────────────── */

interface ModuleItem {
  key: string;
  label: string;
  description: string;
  is_enabled: boolean;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  learning_management: <GraduationCap size={16} className="text-indigo-600" />,
};

export function ModuleToggleSection({ tenantId, initialModules }: { tenantId: string; initialModules: ModuleItem[] }) {
  const { toasts, toast } = useToast();
  const [modules, setModules] = useState<ModuleItem[]>(initialModules);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (moduleKey: string, newValue: boolean) => {
    setToggling(moduleKey);
    const res = await fetch(`/api/platform/tenants/${tenantId}/modules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_key: moduleKey, is_enabled: newValue }),
    });
    const data = await res.json();
    setToggling(null);
    if (res.ok) {
      setModules(prev => prev.map(m => m.key === moduleKey ? { ...m, is_enabled: newValue } : m));
      toast(`${modules.find(m => m.key === moduleKey)?.label} ${newValue ? 'enabled' : 'disabled'}`);
    } else {
      toast(data.error ?? 'Failed to update module', 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="divide-y divide-gray-100">
        {modules.map(m => (
          <div key={m.key} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              {MODULE_ICONS[m.key] ?? <GraduationCap size={16} className="text-indigo-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
            </div>
            <button
              role="switch"
              aria-checked={m.is_enabled}
              disabled={toggling === m.key}
              onClick={() => handleToggle(m.key, !m.is_enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                m.is_enabled ? 'bg-indigo-600' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  m.is_enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Create Company for Tenant ───────────────────────────────────────── */
export function CreateCompanyButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const { toasts, toast } = useToast();
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
    const res = await fetch(`/api/platform/tenants/${tenantId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...form }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setOpen(false); setForm({ name: '', slug: '', industry: '', size_range: '' }); toast('Company created'); router.refresh(); }
    else toast(data.error ?? 'Failed', 'error');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New Company</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create Company for Tenant">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Company Name" required value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Acme Corp" />
          <div>
            <Input
              label="Slug"
              value={form.slug}
              onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="acme-corp"
            />
            {form.slug && (
              <p className="mt-1 text-xs text-indigo-500 flex items-center gap-1">
                <Globe size={11} /> {form.slug}.hrapp.org
              </p>
            )}
          </div>
          <Input label="Industry" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="Technology" />
          <Input label="Company Size" value={form.size_range} onChange={e => setForm(p => ({ ...p, size_range: e.target.value }))} placeholder="100–500" />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Company</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
