import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const duration = options.duration ?? 3000;
    setToasts((prev) => [...prev.slice(-4), { ...options, id }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error', title, message, duration: 4000 }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} className="text-green-400 flex-shrink-0" />,
  error:   <XCircle    size={20} className="text-red-400 flex-shrink-0"   />,
  warning: <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />,
  info:    <Info       size={20} className="text-blue-400 flex-shrink-0"  />,
};

const borders: Record<ToastType, string> = {
  success: 'border-green-500/40',
  error:   'border-red-500/40',
  warning: 'border-yellow-500/40',
  info:    'border-blue-500/40',
};

const glows: Record<ToastType, string> = {
  success: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]',
  error:   'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
  warning: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]',
  info:    'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
};

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-0 right-0 z-[999] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full max-w-sm rounded-2xl border backdrop-blur-xl px-4 py-3 flex items-start gap-3 animate-toast-in ${borders[t.type]} ${glows[t.type]}`}
          style={{ background: 'linear-gradient(135deg, rgba(26,10,46,0.95) 0%, rgba(12,25,41,0.95) 100%)' }}
        >
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{t.title}</p>
            {t.message && <p className="text-gray-400 text-xs mt-0.5 leading-snug">{t.message}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
