import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageCourses } from '@/lib/auth/permissions';
import { getTenantCompany } from '@/lib/tenant-server';
import { CourseNewForm } from './course-new-form';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'ახალი კურსი' };

export default async function CourseNewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];

  if (!canManageCourses(roles)) redirect('/dashboard/learning/courses');

  const tenantResult = await getTenantCompany();
  const companyId = tenantResult && tenantResult !== 'not_found' ? tenantResult.id : null;

  const { data: categories } = await supabase
    .from('course_categories')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  return (
    <CourseNewForm categories={categories ?? []} companyId={companyId} />
  );
}
