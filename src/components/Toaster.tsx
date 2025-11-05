import * as React from "react";
import { ToastProvider as RadixToastProvider } from "./ui/toast";
import { ToastViewport, Toast } from "./ui/toast";
import { ToastProviderCustom, useToast } from "./ui/use-toast";

function ToastList() {
  const { toasts, remove } = useToast();
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          open={true}
          onOpenChange={(o) => !o && remove(t.id)}
        />
      ))}
    </>
  );
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <ToastProviderCustom>
      <RadixToastProvider>
        {children}
        <ToastViewport />
        <ToastList />
      </RadixToastProvider>
    </ToastProviderCustom>
  );
}
