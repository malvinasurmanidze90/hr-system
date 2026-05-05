import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'indigo' | 'brand' | 'emerald' | 'green' | 'amber' | 'yellow' | 'rose' | 'red';
}

const COLORS: Record<string, string> = {
  indigo:  'bg-indigo-500',
  brand:   'bg-indigo-500',
  emerald: 'bg-emerald-500',
  green:   'bg-emerald-500',
  amber:   'bg-amber-500',
  yellow:  'bg-amber-500',
  rose:    'bg-rose-500',
  red:     'bg-rose-500',
};

const HEIGHTS = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

export function Progress({
  value, max = 100, className, showLabel = false, size = 'md', color = 'indigo',
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorClass = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? (COLORS[color] ?? 'bg-indigo-500') : 'bg-amber-500';

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', HEIGHTS[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-700', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
