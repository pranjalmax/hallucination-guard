import * as React from "react";
import { motion } from "framer-motion";

/**
 * Animated neon gradient + subtle sparkles.
 * Sits behind everything (position: fixed).
 */
export default function GradientBG() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Gradient mesh */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(120deg, #0B0F19 0%, #111827 20%, #0B0F19 40%), radial-gradient(40% 60% at 20% 30%, rgba(34,211,238,0.25), transparent), radial-gradient(40% 60% at 80% 60%, rgba(139,92,246,0.22), transparent)",
          backgroundBlendMode: "screen",
        }}
      />
      {/* Animated band */}
      <div
        className="absolute inset-0 animate-bg-pan"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(139,92,246,0.15) 0%, rgba(34,211,238,0.15) 50%, rgba(52,211,153,0.15) 100%)",
          backgroundSize: "200% 100%",
          filter: "blur(40px)",
        }}
      />

      {/* Sparkles (subtle) */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="sparkle-dot absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0.15, scale: 0.9 }}
            animate={{ opacity: [0.15, 0.4, 0.15], y: [-3, -10, -3], x: [0, 5, 0] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
