'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, useRef } from 'react';
import { Search, X, LayoutGrid, List } from 'lucide-react';

const STATUS_OPTS = [
  { value: '',          label: 'ყველა' },
  { value: 'published', label: 'გამოქვეყნებული' },
  { value: 'draft',     label: 'Draft' },
  { value: 'archived',  label: 'არქივი' },
];

const MANDATORY_OPTS = [
  { value: '',      label: 'ყველა ტიპი' },
  { value: 'true',  label: 'სავალდებულო' },
  { value: 'false', label: 'არასავალდებულო' },
];

interface Props { categories: { name: string }[] }

export function CoursesToolbar({ categories }: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();
  const [pending, startTransition] = useTransition();
  const debounce   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q         = sp.get('q') ?? '';
  const status    = sp.get('status') ?? '';
  const cat       = sp.get('cat') ?? '';
  const mandatory = sp.get('mandatory') ?? '';
  const view      = sp.get('view') ?? 'card';

  const push = (overrides: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  };

  const onSearch = (val: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push({ q: val }), 300);
  };

  const filterCount = [q, status, cat, mandatory].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="კურსის სახელი..."
            defaultValue={q}
            onChange={e => onSearch(e.target.value)}
            className={[
              'w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white',
              'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              pending ? 'opacity-60' : '',
            ].join(' ')}
          />
          {q && (
            <button onClick={() => push({ q: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category */}
        <select
          value={cat}
          onChange={e => push({ cat: e.target.value })}
          className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">ყველა კატეგორია</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>

        {/* Mandatory */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {MANDATORY_OPTS.map(opt => (
            <button key={opt.value} onClick={() => push({ mandatory: opt.value })}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                mandatory === opt.value ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          <button onClick={() => push({ view: 'card' })} title="ბარათები"
            className={['p-2 rounded-lg transition-colors', view !== 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'].join(' ')}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => push({ view: 'table' })} title="ცხრილი"
            className={['p-2 rounded-lg transition-colors', view === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'].join(' ')}>
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {STATUS_OPTS.map(opt => (
            <button key={opt.value} onClick={() => push({ status: opt.value })}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                status === opt.value ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {filterCount > 0 && (
          <button
            onClick={() => push({ q: '', status: '', cat: '', mandatory: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={12} />
            ფილტრის გასუფთავება ({filterCount})
          </button>
        )}
      </div>
    </div>
  );
}
