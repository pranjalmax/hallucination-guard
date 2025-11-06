// src/components/BackToTop.tsx
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * BackToTop
 * - Only appears after user scrolls down ~600px
 * - Lives bottom-right so it's actually useful
 */
export default function BackToTop() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={scrollTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-[60] rounded-full
                     bg-white/10 backdrop-blur border border-white/15
                     px-3 py-3 hover:bg-white/15
                     shadow-[0_0_24px_rgba(34,211,238,.25)]"
        >
          <ArrowUp className="h-5 w-5 text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
