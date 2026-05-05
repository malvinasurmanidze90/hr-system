import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canManageTenants } from '@/lib/auth/permissions';
import {
  ArrowLeft, Globe, Building2, CheckCircle2, XCircle,
  UserCog, Calendar, Mail, Users, LayoutGrid,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  AssignAdminButton,
  RemoveAdminButton,
  LinkCompanyButton,
  UnlinkCompanyButton,
  CreateCompanyButton,
  ModuleToggleSection,
} from './tenant-detail-actions';
import { StatusBadge } from '@/components/ui/badge';
import type { UserRoleAssignment } from '@/types';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ tenantId: string }> }

export default async function TenantDetailPage({ params }: Props) {
  const { tenantId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rolesData } = await supabase
    .from('user_roles').select('*').eq('user_id', user.id).eq('is_active', true);
  const roles: UserRoleAssignment[] = rolesData ?? [];
  if (!canManageTenants(roles)) redirect('/dashboard');

  const { data: tenant } = await supabase
    .from('tenants').select('*').eq('id', tenantId).single();
  if (!tenant) redirect('/dashboard/platform/tenants');

  // Parallel fetch
  const [
    { data: adminRoles },
    { data: linkedCompanies },
    { data: availableCompanies },
    { data: tenantModuleRows },
  ] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id, user_id, assigned_at, profile:profiles(id, full_name, email, status)')
      .eq('role', 'tenant_super_admin')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('companies')
      .select('id, name, slug, industry, size_range, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('name'),
    supabase
      .from('companies')
      .select('id, name, slug')
      .is('tenant_id', null)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('tenant_modules')
      .select('module_key, is_enabled')
      .eq('tenant_id', tenantId),
  ]);

  const admins = (adminRoles ?? []) as any[];
  const linked = (linkedCompanies ?? []) as any[];
  const available = (availableCompanies ?? []) as any[];

  const moduleMap: Record<string, boolean> = {};
  for (const row of tenantModuleRows ?? []) moduleMap[row.module_key] = row.is_enabled;

  const KNOWN_MODULES = [
    { key: 'learning_management', label: 'Learning Management', description: 'Courses, enrollments, and employee learning paths' },
  ];
  const initialModules = KNOWN_MODULES.map(m => ({ ...m, is_enabled: moduleMap[m.key] ?? false }));

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-indigo-700 to-purple-800 px-6 pt-6 pb-10">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/dashboard/platform/tenants"
            className="inline-flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm mb-5 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Tenants
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Building2 size={20} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
                {tenant.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
                    <CheckCircle2 size={11} />Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-200 border border-gray-400/30">
                    <XCircle size={11} />Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-200">
                <span className="flex items-center gap-1.5 font-mono">
                  <Globe size={13} />{tenant.slug}.hrapp.org
                </span>
                {tenant.domain && <span className="text-indigo-300">{tenant.domain}</span>}
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />Created {formatDate(tenant.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{admins.length}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Tenant Admins</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{linked.length}</p>
              <p className="text-sm text-indigo-200 mt-0.5">Linked Companies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tenant Admins */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <UserCog size={14} className="text-violet-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Tenant Admins</h2>
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">{admins.length}</span>
            </div>
            <AssignAdminButton tenantId={tenantId} />
          </div>

          {admins.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No admins assigned yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {admins.map((r: any) => {
                const profile = r.profile;
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <Mail size={10} />{profile?.email}
                      </p>
                    </div>
                    <StatusBadge status={profile?.status ?? 'active'} />
                    <RemoveAdminButton tenantId={tenantId} userId={r.user_id} name={profile?.full_name ?? profile?.email ?? 'Admin'} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Linked Companies */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Building2 size={14} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Linked Companies</h2>
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">{linked.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkCompanyButton tenantId={tenantId} available={available} />
              <CreateCompanyButton tenantId={tenantId} />
            </div>
          </div>

          {linked.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No companies linked yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {linked.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    {c.slug && (
                      <p className="text-xs font-mono text-indigo-400 flex items-center gap-0.5">
                        <Globe size={10} />{c.slug}.hrapp.org
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.is_active ? 'active' : 'archived'} />
                  <UnlinkCompanyButton tenantId={tenantId} companyId={c.id} companyName={c.name} />
                </div>
              ))}
            </div>
          )}
        </div>

        </div>{/* end two-col grid */}

        {/* Module Access */}
        <div id="modules" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <LayoutGrid size={14} className="text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Module Access</h2>
            <span className="ml-1 text-xs text-gray-400">Enable or disable features for this tenant</span>
          </div>
          <ModuleToggleSection tenantId={tenantId} initialModules={initialModules} />
        </div>

      </div>
    </div>
  );
}
