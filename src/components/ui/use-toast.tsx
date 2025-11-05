// src/components/ui/use-toast.tsx
import * as React from "react";

type ToastState = { id: number; title?: string; description?: string };
type ToastCtx = {
  toasts: ToastState[];
  push: (t: Omit<ToastState, "id">) => void;
  remove: (id: number) => void;
};

const Ctx = React.createContext<ToastCtx | null>(null);

export function ToastProviderCustom({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);
  const push = (t: Omit<ToastState, "id">) =>
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), ...t }]);
  const remove = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));
  return <Ctx.Provider value={{ toasts, push, remove }}>{children}</Ctx.Provider>;
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProviderCustom");
  return ctx;
}
