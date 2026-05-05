import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'indigo' | 'purple';

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error:   'bg-red-100 text-red-700',
  info:    'bg-sky-100 text-sky-700',
  indigo:  'bg-indigo-100 text-indigo-700',
  purple:  'bg-purple-100 text-purple-700',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', VARIANTS[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active:      'success',
  published:   'indigo',
  completed:   'success',
  draft:       'default',
  not_started: 'default',
  pending:     'warning',
  in_progress: 'info',
  overdue:     'error',
  cancelled:   'error',
  archived:    'default',
};

const STATUS_LABEL: Record<string, string> = {
  published:   'გამოქვეყნებული',
  draft:       'მონახაზი',
  archived:    'არქივი',
  active:      'აქტიური',
  inactive:    'არააქტიური',
  completed:   'დასრულებული',
  in_progress: 'მიმდინარე',
  not_started: 'არ დაწყებულა',
  pending:     'მომლოდინე',
  overdue:     'ვადაგადაცილებული',
  cancelled:   'გაუქმებული',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
