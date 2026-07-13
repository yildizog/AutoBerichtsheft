'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
}

interface ToastContextValue {
  show: (message: string, tone?: Toast['tone']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast muss innerhalb von <Providers> verwendet werden.');
  return ctx.show;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop rounded-full border border-separator bg-surface-tertiary/95 px-4 py-2.5 text-[14px] font-medium shadow-ios backdrop-blur-ios ${
              t.tone === 'error' ? 'text-ios-red' : t.tone === 'success' ? 'text-ios-green' : 'text-label'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
