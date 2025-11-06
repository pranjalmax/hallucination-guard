// src/components/ui/sonner.tsx
// A minimal toast renderer that works with our custom use-toast context.
// No external "sonner" package needed.

import * as React from "react";
import { useToast } from "./use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      <AnimatePresence initial={false}>
        {toasts.map((t: any) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative w-[320px] rounded-xl border border-white/12 bg-white/10
                       px-3.5 py-3 backdrop-blur shadow-[0_0_24px_rgba(139,92,246,.15)]"
          >
            <button
              aria-label="Dismiss"
              onClick={() => remove(t.id)}
              className="absolute right-2 top-2 rounded-full p-1 text-slate-200/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
            {t.title && (
              <div className="text-sm font-semibold text-white">{t.title}</div>
            )}
            {t.description && (
              <div className="mt-1 text-xs text-slate-300/90">{t.description}</div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Toaster;
