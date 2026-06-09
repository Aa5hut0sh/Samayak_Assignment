'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { bg: '#d5f5ec', color: '#1c7a5c', border: '#b6ead9' },
  error:   { bg: '#fdecee', color: '#b3303c', border: '#f9c8cc' },
  warning: { bg: '#fef3d5', color: '#9a6800', border: '#fde5a0' },
  info:    { bg: '#ddeeff', color: 'var(--brand-deep)', border: '#b8d8f8' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              className="fade-up"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: c.bg, color: c.color,
                border: `1px solid ${c.border}`,
                borderRadius: 14, padding: '12px 16px',
                fontSize: 14, fontWeight: 600,
                boxShadow: 'var(--sh-md)',
                minWidth: 260, maxWidth: 380,
              }}
            >
              <Icon size={16} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};