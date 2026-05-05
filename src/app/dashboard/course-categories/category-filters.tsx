'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, useRef } from 'react';
import { Search, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',         label: 'ყველა' },
  { value: 'active',   label: 'აქტიური' },
  { value: 'inactive', label: 'არააქტიური' },
];

export function CategoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStatus = searchParams.get('status') ?? '';
  const currentSearch = searchParams.get('q') ?? '';

  const pushParams = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const handleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value, status: currentStatus }), 300);
  };

  const handleStatus = (value: string) => {
    pushParams({ status: value, q: currentSearch });
  };

  const clearSearch = () => pushParams({ q: '', status: currentStatus });

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="სახელით ძებნა..."
          defaultValue={currentSearch}
          onChange={e => handleSearch(e.target.value)}
          className={[
            'w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white',
            'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            isPending ? 'opacity-60' : '',
          ].join(' ')}
        />
        {currentSearch && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleStatus(opt.value)}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              currentStatus === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
