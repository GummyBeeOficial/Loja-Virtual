'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 5 seconds
    const timeoutId = setTimeout(() => {
      removeToast(id);
    }, 5000);

    timeoutsRef.current[id] = timeoutId;
  }, [removeToast]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    const currentTimeouts = timeoutsRef.current;
    return () => {
      Object.values(currentTimeouts).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border pointer-events-auto animate-in slide-in-from-right-full duration-300",
            toast.type === 'success' && "bg-green-50 border-green-200 text-green-800",
            toast.type === 'error' && "bg-red-50 border-red-200 text-red-800",
            toast.type === 'warning' && "bg-orange-50 border-orange-200 text-orange-800",
            toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
            {toast.type === 'error' && <XCircle size={20} className="text-red-500" />}
            {toast.type === 'warning' && <AlertCircle size={20} className="text-orange-500" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-500" />}
          </div>
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            <X size={16} className="opacity-50" />
          </button>
        </div>
      ))}
    </div>
  );
}
