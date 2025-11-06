// src/components/ui/use-toast.tsx
import * as React from "react";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  /** auto-dismiss ms; set 0 or undefined to keep until manual close */
  duration?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => string;
  remove: (id: string) => void;
  clear: () => void;
};

const ToastCtx = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = `toast_${Math.random().toString(36).slice(2, 9)}`;
      const item: ToastItem = { id, duration: 3800, ...t };
      setToasts((prev) => [...prev, item]);
      if (item.duration && item.duration > 0) {
        window.setTimeout(() => remove(id), item.duration);
      }
      return id;
    },
    [remove]
  );

  const clear = React.useCallback(() => setToasts([]), []);

  const value = React.useMemo(
    () => ({ toasts, push, remove, clear }),
    [toasts, push, remove, clear]
  );

  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
