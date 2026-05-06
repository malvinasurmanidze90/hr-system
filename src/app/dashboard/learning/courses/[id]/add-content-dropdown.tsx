'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Plus, FileText, Video, File, Link2,
  HelpCircle, ClipboardList, FolderPlus, Copy, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Item & Section definitions ──────────────────────────────────────── */

interface ContentItem {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  disabled?: boolean;
}

const SECTIONS: { heading: string; items: ContentItem[] }[] = [
  {
    heading: 'სტანდარტული კონტენტი',
    items: [
      {
        type: 'text',
        label: 'ტექსტური გაკვეთილი',
        description: 'ტექსტი, სტატიები, სახელმძღვანელოები',
        icon: FileText,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
      },
      {
        type: 'video',
        label: 'ვიდეო',
        description: 'YouTube, Vimeo ან ატვირთვა',
        icon: Video,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-50',
      },
      {
        type: 'pdf',
        label: 'PDF',
        description: 'PDF-ის ატვირთვა ან ბმული',
        icon: File,
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50',
      },
      {
        type: 'link',
        label: 'ბმული',
        description: 'გარე URL ან რესურსი',
        icon: Link2,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50',
      },
    ],
  },
  {
    heading: 'სასწავლო აქტივობები',
    items: [
      {
        type: 'quiz',
        label: 'კითხვარი',
        description: 'მრავალმხრივი, სწორი/მცდარი',
        icon: HelpCircle,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        type: 'assignment',
        label: 'დავალება',
        description: 'ფაილის ატვირთვა ან წერილობითი',
        icon: ClipboardList,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
      },
    ],
  },
  {
    heading: 'სხვა',
    items: [
      {
        type: 'add_section',
        label: 'სექციის დამატება',
        description: 'ახალი მოდული',
        icon: FolderPlus,
        iconColor: 'text-gray-600',
        iconBg: 'bg-gray-100',
      },
      {
        type: 'clone_section',
        label: 'სექციის დუბლირება',
        description: 'სექციის კოპირება',
        icon: Copy,
        iconColor: 'text-gray-500',
        iconBg: 'bg-gray-100',
        disabled: true,
      },
    ],
  },
];

/* ── Props ───────────────────────────────────────────────────────────── */

interface AddContentDropdownProps {
  onAddSection: () => void;
  onSelectType: (type: string) => void;
  hasModules: boolean;
}

/* ── Component ───────────────────────────────────────────────────────── */

export function AddContentDropdown({ onAddSection, onSelectType, hasModules }: AddContentDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: ContentItem) => {
    if (item.disabled) return;
    setOpen(false);
    if (item.type === 'add_section') {
      onAddSection();
    } else {
      onSelectType(item.type);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all select-none',
          open
            ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md hover:shadow-indigo-200'
        )}
      >
        <Plus size={15} className={cn('transition-transform duration-200', open && 'rotate-45')} />
        კონტენტის დამატება
        <ChevronDown size={13} className={cn('transition-transform duration-200 opacity-70', open && 'rotate-180')} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/80 overflow-hidden">

          {SECTIONS.map((section, si) => (
            <div key={section.heading}>
              {/* Section divider + heading */}
              {si > 0 && <div className="h-px bg-gray-100 mx-3" />}
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest select-none">
                {section.heading}
              </p>

              {/* Items */}
              {section.items.map(item => {
                const Icon = item.icon;
                const isContentType = item.type !== 'add_section' && item.type !== 'clone_section';
                const unavailable = isContentType && !hasModules;
                const isDisabled = item.disabled || unavailable;

                return (
                  <button
                    key={item.type}
                    onClick={() => handleSelect(item)}
                    disabled={isDisabled}
                    title={unavailable ? 'Add a section first' : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-gray-50 cursor-pointer'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)}>
                      <Icon size={15} className={item.iconColor} />
                    </div>

                    {/* Labels */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-none mb-0.5">{item.label}</p>
                      <p className="text-xs text-gray-400 leading-none">{item.description}</p>
                    </div>

                    {/* "Soon" badge for disabled items */}
                    {item.disabled && (
                      <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-400 rounded">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}

              {si === SECTIONS.length - 1 && <div className="pb-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
