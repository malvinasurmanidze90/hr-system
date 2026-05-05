'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import type { UserRole } from '@/types';

const ROLES: UserRole[] = ['super_admin', 'ceo', 'hr_admin', 'bu_head', 'manager', 'employee'];

export function OnboardingActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', target_role: 'employee' as UserRole, duration_days: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
    await supabase.from('onboarding_programs').insert({
      ...form, company_id: profile?.company_id, created_by: user!.id,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> New Program</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New Onboarding Program">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Program Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="New Employee Onboarding" />
          <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Target Role" value={form.target_role} onChange={e => setForm(p => ({ ...p, target_role: e.target.value as UserRole }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
            <Input label="Duration (days)" type="number" min={1} value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: parseInt(e.target.value) }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Program</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
