import { UserRole, UserRoleAssignment } from '@/types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  ceo:         80,
  hr_admin:    70,
  bu_head:     60,
  manager:     50,
  employee:    10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  ceo:         'CEO',
  hr_admin:    'HR Admin',
  bu_head:     'Business Unit Head',
  manager:     'Manager',
  employee:    'Employee',
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

export function isSuperAdmin(roles: UserRoleAssignment[]): boolean {
  return hasRole(roles, 'super_admin');
}

export function canManageUsers(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['super_admin', 'hr_admin', 'ceo']);
}

export function canManageCourses(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['super_admin', 'hr_admin']);
}

export function canViewReports(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['super_admin', 'hr_admin', 'ceo', 'bu_head', 'manager']);
}

export function canManageCompany(roles: UserRoleAssignment[]): boolean {
  return hasAnyRole(roles, ['super_admin', 'hr_admin']);
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
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',                 icon: 'LayoutDashboard', roles: ['super_admin','ceo','hr_admin','bu_head','manager','employee'] },
  { label: 'My Learning',     href: '/dashboard/portal',          icon: 'BookOpen',        roles: ['employee','manager','bu_head'] },
  { label: 'კურსები',         href: '/dashboard/courses',              icon: 'GraduationCap',   roles: ['super_admin','hr_admin','ceo','bu_head','manager','employee'] },
  { label: 'კურს. კატეგ.',   href: '/dashboard/course-categories',    icon: 'Tag',             roles: ['super_admin','hr_admin','ceo'] },
  { label: 'Onboarding',      href: '/dashboard/lms/onboarding',       icon: 'UserCheck',       roles: ['super_admin','hr_admin','ceo','bu_head','manager'] },
  { label: 'Users',           href: '/dashboard/admin/users',     icon: 'Users',           roles: ['super_admin','hr_admin','ceo'] },
  { label: 'Business Units',  href: '/dashboard/admin/business-units', icon: 'Building2', roles: ['super_admin','hr_admin'] },
  { label: 'Companies',       href: '/dashboard/admin/companies', icon: 'Building',        roles: ['super_admin'] },
  { label: 'Reports',         href: '/dashboard/reports',         icon: 'BarChart3',       roles: ['super_admin','hr_admin','ceo','bu_head','manager'] },
  { label: 'AI Assistant',    href: '/dashboard/ai',              icon: 'Sparkles',        roles: ['super_admin','hr_admin','ceo','bu_head','manager','employee'] },
];

export function getNavItems(primaryRole: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(primaryRole));
}
