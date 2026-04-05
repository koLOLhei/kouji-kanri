"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 3000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Clean up timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const ctx: ToastContextValue = {
    success: (message) => add(message, "success"),
    error: (message) => add(message, "error"),
    info: (message) => add(message, "info"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { id, message, variant } = toast;

  const icon =
    variant === "success" ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    ) : variant === "error" ? (
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    ) : (
      <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
    );

  const borderColor =
    variant === "success"
      ? "border-l-emerald-500"
      : variant === "error"
      ? "border-l-red-500"
      : "border-l-blue-500";

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center gap-3 bg-white rounded-2xl shadow-lg shadow-gray-200 border border-gray-100 border-l-4 ${borderColor} px-4 py-3.5 slide-in`}
    >
      {icon}
      <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        aria-label="閉じる"
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
