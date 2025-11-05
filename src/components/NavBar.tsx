import * as React from "react";
import { ShieldAlert, Github } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipProvider } from "./ui/tooltip";
import { Separator } from "./ui/separator";

export default function NavBar() {
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="glass border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-accentCyan drop-shadow" />
            <div className="leading-tight">
              <div className="shimmer text-white font-semibold text-lg">Hallucination Guard</div>
              <div className="text-xs text-muted">Evidence Aligner & Red-Flag Highlighter</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip content="Star on GitHub (opens new tab)">
                <a
                  className="rounded-full border border-border bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  href="https://github.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="inline-flex items-center gap-2">
                    <Github className="h-4 w-4" /> GitHub
                  </span>
                </a>
              </Tooltip>
            </TooltipProvider>
            <Separator className="w-px h-6 bg-white/10" />
            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Back to Top
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
