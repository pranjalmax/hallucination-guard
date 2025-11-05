import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        background: "#0B0F19",
        card: "#0F172A",
        muted: "#94A3B8",
        accentViolet: "#8B5CF6",
        accentCyan: "#22D3EE",
        accentMint: "#34D399",
        warn: "#F59E0B",
        error: "#F43F5E",
        border: "rgba(139,92,246,0.25)",
      },
      borderRadius: {
        xl: "1.25rem",
        full: "9999px",
      },
      boxShadow: {
        "glow-violet": "0 0 30px rgba(139,92,246,0.35)",
        "glow-cyan": "0 0 30px rgba(34,211,238,0.35)",
      },
      animation: {
        "bg-pan": "bg-pan 10s ease-in-out infinite alternate",
        "sparkle": "sparkle 3.5s linear infinite",
        "fade-in": "fade-in 600ms ease forwards",
      },
      keyframes: {
        "bg-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        "sparkle": {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0.4" },
          "50%": { opacity: "0.15" },
          "100%": { transform: "translateY(-20px) translateX(10px)", opacity: "0.4" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
