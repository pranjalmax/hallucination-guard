// toast.tsx
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cn } from "../../lib/utils";

export const ToastProvider = ToastPrimitives.Provider;

export function ToastViewport() {
  return (
    <ToastPrimitives.Viewport
      className={cn(
        "fixed top-4 right-4 z-[100] flex max-h-screen w-80 flex-col gap-2 p-2 outline-none"
      )}
    />
  );
}

export function Toast({
  title,
  description,
  open,
  onOpenChange,
}: {
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <ToastPrimitives.Root
      open={open}
      onOpenChange={onOpenChange}
      className="glass border border-border rounded-xl p-4 text-sm text-white shadow-glow-violet"
    >
      {title && <ToastPrimitives.Title className="font-semibold">{title}</ToastPrimitives.Title>}
      {description && (
        <ToastPrimitives.Description className="text-muted mt-1">
          {description}
        </ToastPrimitives.Description>
      )}
    </ToastPrimitives.Root>
  );
}
