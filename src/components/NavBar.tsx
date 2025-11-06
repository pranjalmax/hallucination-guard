// src/components/NavBar.tsx
import * as React from "react";
import { Button } from "./ui/button";
import { Github } from "lucide-react";

export default function NavBar() {
  return (
    <nav className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-2xl
                    border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-accentCyan shadow-[0_0_10px_rgba(34,211,238,.6)]" />
        <div className="text-sm font-semibold text-white">Hallucination Guard</div>
        <div className="text-xs text-muted">Evidence Aligner & Red-Flag Highlighter</div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://github.com/pranjalmax/hallucination-guard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex"
        >
          <Button variant="outline" size="sm">
            <Github className="mr-1 h-4 w-4" /> GitHub
          </Button>
        </a>
      </div>
    </nav>
  );
}
