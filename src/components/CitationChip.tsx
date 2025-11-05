// src/components/CitationChip.tsx
import * as React from "react";
import { Badge } from "./ui/badge";

export default function CitationChip({
  label = "[C]",
  title,
  onClick,
}: {
  label?: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || "Jump to source"}
      className="inline-flex items-center align-middle ml-1"
    >
      <Badge
        intent="info"
        className="rounded-full px-2 py-[2px] text-[10px] font-semibold shadow-[0_0_10px_rgba(34,211,238,0.5)] hover:shadow-[0_0_14px_rgba(34,211,238,0.75)] transition-shadow"
      >
        {label}
      </Badge>
    </button>
  );
}
