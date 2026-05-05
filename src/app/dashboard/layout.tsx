import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { getPrimaryRole } from '@/lib/auth/permissions';
import type { UserRoleAssignment } from '@/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(name)')
    .eq('id', user.id)
    .single();

  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);
  const companyName = (profile?.company as { name?: string } | null)?.name;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        userName={profile?.full_name ?? user.email ?? 'User'}
        userEmail={user.email ?? ''}
        primaryRole={primaryRole}
        companyName={companyName}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
