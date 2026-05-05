'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

export function CourseTabs({ tabs, current }: { tabs: Tab[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (key: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (key === tabs[0].key) p.delete('tab');
    else p.set('tab', key);
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => go(tab.key)}
          className={[
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            current === tab.key
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={[
              'ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
              current === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500',
            ].join(' ')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
