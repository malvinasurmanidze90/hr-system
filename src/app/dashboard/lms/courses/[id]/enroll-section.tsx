'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select, Input } from '@/components/ui/input';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';

export function EnrollSection({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: '', due_date: '' });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('status', 'active').order('full_name'),
      supabase.from('course_enrollments').select('*, user:profiles(full_name)').eq('course_id', courseId).limit(10),
    ]).then(([{ data: u }, { data: e }]) => {
      setUsers(u ?? []);
      setEnrolled(e ?? []);
    });
  }, [courseId]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('course_enrollments').upsert({
      course_id: courseId,
      user_id: form.user_id,
      assigned_by: user?.id,
      due_date: form.due_date || null,
      status: 'not_started',
    }, { onConflict: 'course_id,user_id' });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrolled ({enrolled.length})</CardTitle>
            <Button size="sm" onClick={() => setOpen(true)}><UserPlus size={14} /> Enroll</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {enrolled.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {enrolled.map((e: any) => (
                <li key={e.id} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {getInitials(e.user?.full_name ?? 'U')}
                  </div>
                  <p className="text-sm text-gray-700 truncate">{e.user?.full_name}</p>
                  <span className="ml-auto text-xs text-gray-400">{e.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No enrollments yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Enroll User">
        <form onSubmit={handleEnroll} className="p-6 space-y-4">
          <Select label="Select User" required value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}>
            <option value="">— Choose user —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
          </Select>
          <Input label="Due Date (optional)" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Enroll</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
