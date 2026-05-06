import { UserRole, UserRoleAssignment } from '@/types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  platform_super_admin: 200,
  tenant_super_admin:   150,
  super_admin:          100,
  ceo:                   80,
  hr_admin:              70,
  bu_head:               60,
  manager:               50,
  employee:              10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_super_admin: 'Platform Admin',
  tenant_super_admin:   'Tenant Admin',
  super_admin:          'Super Admin',
  ceo:                  'CEO',
  hr_admin:             'HR Admin',
  bu_head:              'Business Unit Head',
  manager:              'Manager',
  employee:             'Employee',
};

export function getPrimaryRole(roles: UserRoleAssignment[]): UserRole {
  if (!roles.length) return 'employee';
  const sorted = [...roles]
    .filter(r => r.is_active)
    .sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]);
  return sorted[0]?.role ?? 'employee';
}

export function hasRole(roles: UserRoleAssignment[], role: UserRole): boolean {
  return roles.some(r => r.role === role && r.is_active);
}

export function hasAnyRole(roles: UserRoleAssignment[], checkRoles: UserRole[]): boolean {
  return checkRoles.some(r => hasRole(roles, r));
}

export function isPlatformSuperAdmin(roles: UserRoleAssignment[]): boolean {
  return hasRole(roles, 'platform_super_admin');
}

export function isTenantSuperAdmin(roles: UserRoleAssignment[]): boolean {
  return hasRole(roles, 'tenant_super_admin');
}

export function isSuperAdmin(roles: UserRoleAssignment[]): boolean {
  return hasRole(roles, 'super_admin');
}

export function canManageUsers(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['platform_super_admin', 'tenant_super_admin', 'super_admin', 'hr_admin', 'ceo']);
}

export function canManageCourses(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['platform_super_admin', 'tenant_super_admin', 'super_admin', 'ceo', 'hr_admin']);
}

export function canViewReports(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['tenant_super_admin', 'super_admin', 'hr_admin', 'ceo', 'bu_head', 'manager']);
}

export function canManageCompany(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['platform_super_admin', 'tenant_super_admin', 'super_admin', 'hr_admin']);
}

export function canManageTenants(roles: UserRoleAssignment[]): boolean {
  return hasRole(roles, 'platform_super_admin');
}

export function canAccessBU(
  roles: UserRoleAssignment[],
  businessUnitId: string
): boolean {
  if (isSuperAdmin(roles)) return true;
  return roles.some(
    r => r.is_active && r.business_unit_id === businessUnitId
  );
}

// Navigation items per role
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  section?: string;
  module?: string; // module_key — gated for non-platform admins unless tenant has it enabled
}

export const NAV_ITEMS: NavItem[] = [
  // ── General ──────────────────────────────────────────────────────────
  { label: 'Dashboard',      href: '/dashboard',                      icon: 'LayoutDashboard', roles: ['platform_super_admin','tenant_super_admin','super_admin','ceo','hr_admin','bu_head','manager','employee'] },
  { label: 'Tenants',        href: '/dashboard/platform/tenants',     icon: 'Layers',          roles: ['platform_super_admin'] },
  { label: 'My Learning',    href: '/dashboard/portal',               icon: 'BookOpen',        roles: ['employee','manager','bu_head'],                                                                      module: 'learning_management' },

  // ── Learning Management ───────────────────────────────────────────────
  { label: 'Learning Management', href: '/dashboard/learning',         icon: 'BookMarked',      roles: ['platform_super_admin','tenant_super_admin','super_admin','hr_admin','ceo','bu_head','manager','employee'], section: 'Learning Management', module: 'learning_management' },
  { label: 'Courses',        href: '/dashboard/learning/courses',     icon: 'GraduationCap',   roles: ['platform_super_admin','tenant_super_admin','super_admin','hr_admin','ceo','bu_head','manager','employee'], section: 'Learning Management', module: 'learning_management' },

  // ── Admin ─────────────────────────────────────────────────────────────
  { label: 'Users',          href: '/dashboard/admin/users',          icon: 'Users',           roles: ['tenant_super_admin','super_admin','hr_admin','ceo'],                               section: 'Admin' },
  { label: 'Business Units', href: '/dashboard/admin/business-units', icon: 'Building2',       roles: ['tenant_super_admin','super_admin','hr_admin'],                                     section: 'Admin' },
  { label: 'Companies',      href: '/dashboard/admin/companies',      icon: 'Building',        roles: ['platform_super_admin','tenant_super_admin','super_admin'],                         section: 'Admin' },

  // ── Tools ─────────────────────────────────────────────────────────────
  { label: 'Reports',        href: '/dashboard/reports',              icon: 'BarChart3',       roles: ['tenant_super_admin','super_admin','hr_admin','ceo','bu_head','manager'],            section: 'Tools' },
  { label: 'AI Assistant',   href: '/dashboard/ai',                   icon: 'Sparkles',        roles: ['platform_super_admin','tenant_super_admin','super_admin','hr_admin','ceo','bu_head','manager','employee'], section: 'Tools' },
];

export function getNavItems(primaryRole: UserRole, enabledModules: string[] = []): NavItem[] {
  return NAV_ITEMS.filter(item => {
    if (!item.roles.includes(primaryRole)) return false;
    if (item.module && primaryRole !== 'platform_super_admin') {
      return enabledModules.includes(item.module);
    }
    return true;
  });
}
