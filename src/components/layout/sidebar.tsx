'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, GraduationCap, UserCheck, Users,
  Building2, Building, BarChart3, Sparkles, LogOut, ChevronLeft, ChevronRight, Bell, Tag, Layers,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { ROLE_LABELS, getNavItems } from '@/lib/auth/permissions';
import type { UserRole } from '@/types';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, BookOpen, GraduationCap, UserCheck,
  Users, Building2, Building, BarChart3, Sparkles, Tag, Layers,
};

interface SidebarProps {
  userName: string;
  userEmail: string;
  primaryRole: UserRole;
  companyName?: string;
}

export function Sidebar({ userName, userEmail, primaryRole, companyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItems(primaryRole);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">HR</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">HR OS</p>
            {companyName && <p className="text-xs text-gray-500 truncate">{companyName}</p>}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {navItems.map((item, i) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const prevSection = i > 0 ? navItems[i - 1].section : undefined;
          const showSection = !collapsed && item.section && item.section !== prevSection;

          return (
            <div key={item.href}>
              {showSection && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest select-none">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 text-xs font-bold">
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{ROLE_LABELS[primaryRole]}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} title="Sign out" className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
              <LogOut size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={handleSignOut} title="Sign out" className="mt-2 w-full flex justify-center p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
