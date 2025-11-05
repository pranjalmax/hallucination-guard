import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({
  children,
  intent = "info",
  className,
}: {
  children: React.ReactNode;
  intent?: "info" | "success" | "warn" | "error";
  className?: string;
}) {
  const styles = {
    info: "bg-accentViolet/20 text-white border border-accentViolet/30",
    success: "bg-accentMint/20 text-white border border-accentMint/30",
    warn: "bg-warn/20 text-white border border-warn/30",
    error: "bg-error/20 text-white border border-error/30",
  }[intent];

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", styles, className)}>
      {children}
    </span>
  );
}
