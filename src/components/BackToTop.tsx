// src/components/BackToTop.tsx
import * as React from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 rounded-full px-3.5 py-3 bg-white/10 backdrop-blur
                 border border-white/15 text-white hover:bg-white/15 transition
                 shadow-[0_0_20px_rgba(34,211,238,.35)]"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
