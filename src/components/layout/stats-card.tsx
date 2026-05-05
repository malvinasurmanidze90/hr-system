import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

const COLORS: Record<string, { bg: string; icon: string }> = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600' },
  violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600' },
  rose:    { bg: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600' },
  blue:    { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600' },
  green:   { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600' },
  yellow:  { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600' },
  purple:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-600' },
  red:     { bg: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600' },
};

export function StatsCard({ title, value, subtitle, icon, trend, color = 'indigo' }: StatsCardProps) {
  const c = COLORS[color] ?? COLORS.indigo;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={cn('p-3 rounded-2xl flex-shrink-0', c.icon)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
