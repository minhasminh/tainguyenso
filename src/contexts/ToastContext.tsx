import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }: { type?: ToastType; title?: string; message: string; duration?: number }) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => {
    toast({ type: 'success', title: title || 'Thành công', message });
  }, [toast]);

  const error = useCallback((message: string, title?: string) => {
    toast({ type: 'error', title: title || 'Lỗi thao tác', message, duration: 6000 });
  }, [toast]);

  const info = useCallback((message: string, title?: string) => {
    toast({ type: 'info', title: title || 'Thông báo', message });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container floating at top-right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((t) => {
          let borderClass = 'border-slate-200 bg-white';
          let icon = <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;

          if (t.type === 'success') {
            borderClass = 'border-emerald-200 bg-emerald-50/95';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
          } else if (t.type === 'error') {
            borderClass = 'border-rose-200 bg-rose-50/95';
            icon = <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
          } else if (t.type === 'warning') {
            borderClass = 'border-amber-200 bg-amber-50/95';
            icon = <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur transition-all duration-300 animate-in slide-in-from-top-2 ${borderClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-sm font-semibold text-slate-900 mb-0.5">{t.title}</div>}
                <div className="text-sm text-slate-700 leading-snug break-words">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
