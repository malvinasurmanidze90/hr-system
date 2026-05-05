'use client';
import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return { toasts, toast };
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white',
            t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          )}
        >
          {t.type === 'success'
            ? <CheckCircle2 size={16} className="flex-shrink-0" />
            : <XCircle size={16} className="flex-shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
