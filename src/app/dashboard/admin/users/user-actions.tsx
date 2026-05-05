'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import type { UserRole } from '@/types';

interface Props {
  companies: { id: string; name: string }[];
  businessUnits: { id: string; name: string; company_id: string }[];
}

const ROLES: UserRole[] = ['super_admin', 'ceo', 'hr_admin', 'bu_head', 'manager', 'employee'];

export function UserActions({ companies, businessUnits }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', role: 'employee' as UserRole,
    company_id: companies[0]?.id ?? '', business_unit_id: '',
    position: '', department: '',
  });

  const filteredBUs = businessUnits.filter(bu => bu.company_id === form.company_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add User</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add User" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            <Input label="Email" type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <Input label="Temporary Password" type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" minLength={8} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Company" required value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value, business_unit_id: '' }))}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Role" required value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
          <Select label="Business Unit (optional)" value={form.business_unit_id} onChange={e => setForm(p => ({ ...p, business_unit_id: e.target.value }))}>
            <option value="">— None —</option>
            {filteredBUs.map(bu => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Position" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
            <Input label="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create User</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
