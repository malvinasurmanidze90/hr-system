import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/badge';
import { AddCourseModal } from './add-course-modal';
import { CourseRowActions } from './course-row-actions';
import { getTenantCompany, getTenantScopeCompanyIds } from '@/lib/tenant-server';
import { getPrimaryRole } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/utils';
import { GraduationCap, Search, X, AlertCircle, BookOpen } from 'lucide-react';
import type { UserRoleAssignment } from '@/types';

export const metadata = { title: 'კურსები' };

const CAN_CREATE_ROLES = ['platform_super_admin', 'tenant_super_admin', 'super_admin', 'hr_admin', 'ceo'];

interface Props {
  searchParams: Promise<{ q?: string; status?: string; cat?: string }>;
}

export default async function CoursesLibraryPage({ searchParams }: Props) {
  const { q, status, cat } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  const primaryRole = getPrimaryRole(roles);
  const canCreate = CAN_CREATE_ROLES.includes(primaryRole);

  const tenantResult = await getTenantCompany();
  const tenantId = tenantResult && tenantResult !== 'not_found' ? tenantResult.id : null;
  const tenantCompanyIds = !tenantId ? await getTenantScopeCompanyIds(roles) : null;

  const applyTenant = (q: any) => {
    if (tenantId) return q.eq('company_id', tenantId);
    if (tenantCompanyIds?.length) return q.in('company_id', tenantCompanyIds);
    return q;
  };

  const [{ data: categories }, { count: totalCount }] = await Promise.all([
    supabase.from('course_categories').select('id, name').eq('status', 'active').order('name'),
    applyTenant(supabase.from('courses').select('*', { count: 'exact', head: true })),
  ]);

  let query = applyTenant(
    supabase
      .from('courses')
      .select('id, title, category, status, created_at, updated_at, course_enrollments(count)')
      .order('updated_at', { ascending: false })
  );
  if (status && ['draft', 'published', 'archived'].includes(status)) query = query.eq('status', status);
  if (cat)        query = query.eq('category', cat);
  if (q?.trim()) query = query.ilike('title', `%${q.trim()}%`);

  const { data: courses, error } = await query;
  const cats = categories ?? [];
  const rows = courses ?? [];

  const STATUS_TABS = [
    { value: '',          label: 'ყველა' },
    { value: 'published', label: 'გამოქვეყნებული' },
    { value: 'draft',     label: 'Draft' },
    { value: 'archived',  label: 'არქივი' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">კურსები</h1>
            <p className="text-xs text-gray-500 mt-0.5">სულ {totalCount ?? 0} კურსი</p>
          </div>
          {canCreate && (
            <AddCourseModal categories={cats} companyId={tenantId} />
          )}
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">

          {/* Search + category in one plain GET form — no event handlers needed */}
          <form method="GET" className="flex flex-wrap items-center gap-2 flex-1">
            {status && <input type="hidden" name="status" value={status} />}

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="კურსის სახელი..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <select
              name="cat"
              defaultValue={cat}
              className="py-2 pl-3 pr-7 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">ყველა კატეგორია</option>
              {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            {/* Submit */}
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
            >
              გაფილტვრა
            </button>

            {/* Clear filters */}
            {(q || cat) && (
              <Link
                href={status ? `?status=${status}` : '?'}
                className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={12} />გასუფთავება
              </Link>
            )}
          </form>

          {/* Status pills */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
            {STATUS_TABS.map(opt => {
              const params = new URLSearchParams();
              if (q)           params.set('q', q);
              if (cat)         params.set('cat', cat);
              if (opt.value)   params.set('status', opt.value);
              return (
                <Link
                  key={opt.value}
                  href={`?${params.toString()}`}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    (status ?? '') === opt.value
                      ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">
            <AlertCircle size={15} className="flex-shrink-0" />
            მონაცემების ჩატვირთვა ვერ მოხერხდა: {error.message}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {rows.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <GraduationCap size={30} className="text-indigo-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {q || status || cat ? 'კურსები ვერ მოიძებნა' : 'კურსები ჯერ არ გაქვთ'}
              </p>
              <p className="text-xs text-gray-400 max-w-xs">
                {q || status || cat
                  ? 'სცადეთ განსხვავებული ფილტრი ან გაასუფთავეთ ძიება.'
                  : 'დააჭირეთ „კურსის დამატება" პირველი კურსის შესაქმნელად.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['', 'კურსი', 'კოდი', 'კატეგორია', 'სტატუსი', 'განახლდა', 'მოქმედება'].map((h, i) => (
                      <th
                        key={i}
                        className={[
                          'px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap',
                          i === 0 ? 'w-10' : '',
                          i === 6 ? 'text-right' : '',
                        ].join(' ')}
                      >
                        {h === '' ? (
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((course: any) => {
                    const code = course.id.slice(0, 8).toUpperCase();
                    const enrollCount = course.course_enrollments?.[0]?.count ?? 0;
                    return (
                      <tr key={course.id} className="hover:bg-indigo-50/20 transition-colors group">

                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        </td>

                        {/* Course title */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <BookOpen size={14} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/learning/courses/${course.id}`}
                                className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block max-w-xs"
                              >
                                {course.title}
                              </Link>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {enrollCount} მონაწილე
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            {code}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          {course.category
                            ? <span className="text-sm text-gray-700">{course.category}</span>
                            : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={course.status} />
                        </td>

                        {/* Last updated */}
                        <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(course.updated_at ?? course.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <CourseRowActions course={course} categories={cats} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer count */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-400">{rows.length} კურსი</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
