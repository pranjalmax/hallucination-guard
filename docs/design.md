# Design — Hallucination Guard (Tokens, Motion, UX)

A modern, dark, “very AI” aesthetic with subtle neon glows, glassy surfaces, and tasteful motion. These rules guide the look/feel across all components.

---

## 1) Colors (Design Tokens)

**Base**
- Background: `#0B0F19` (page)
- Card: `#0F172A` (panels / surfaces)
- Muted text: `#94A3B8`
- Border (on dark): `rgba(255,255,255,0.10)` (≈ `#FFFFFF1A`)

**Accents**
- Neon Violet: `#8B5CF6` (primary)
- Electric Cyan: `#22D3EE` (info / focus glow)
- Mint: `#34D399` (success/supported)
- Warning: `#F59E0B` (unknown/amber)
- Error: `#F43F5E` (contradiction/failure)

**Usage**
- Primary CTAs/buttons: Violet
- Links/focus rings: Cyan
- Status chips: Mint (supported), Amber (unknown), Error (contradiction)

> Keep contrast sufficient on dark backgrounds (WCAG AA). For small text on dark surfaces, prefer `#E2E8F0`–`#F8FAFC`.

---

## 2) Radii & Elevation

- **Radii**
  - Cards & large panels: **1.25rem** (rounded-2xl / `rounded-[1.25rem]`)
  - Chips/Badges/Inputs: **Full** (`rounded-full`)
- **Glassy Elevation**
  - Surface: `background: rgba(255,255,255,0.04–0.06)` over dark base
  - Border: `1px solid rgba(255,255,255,0.10)`
  - Shadow (subtle glow on hover/focus):
    - `0 0 12px rgba(139,92,246,0.35)` for violet focus
    - `0 0 12px rgba(34,211,238,0.35)` for cyan focus

---

## 3) Typography

- **UI font:** Inter (weights 400, 600)
- **Code font:** JetBrains Mono (400, 600) for code snippets/monospace blocks
- **Sizes (Tailwind)**
  - H1: `text-3xl sm:text-4xl` (600)
  - H2: `text-2xl` (600)
  - Body: `text-sm` (400)
  - Muted copy: `text-xs text-muted`
- **Line heights**
  - Body copy: `leading-relaxed`
  - Tight labels/buttons: default Tailwind

---

## 4) Motion (Framer Motion + CSS)

- **Durations**
  - Hover/press: **180–240ms** ease
  - Enters/exits: **400–600ms**
- **Easing**
  - `ease-out` for enters, `ease-in` for exits
- **Reduced motion**
  - Always honor `prefers-reduced-motion`: keep opacity fades but remove large translations
- **Micro-interactions**
  - Hover: `scale(1.02)` + soft glow
  - Press: `scale(0.98)`

**Example (Framer Motion)**
```tsx
<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
  {/* content */}
</motion.div>


5) Backgrounds & Effects

Animated Gradient Header

A soft, moving gradient mesh behind the hero/title.

CSS suggestion

/* In a global CSS or utility */
.gradient-anim {
  background: radial-gradient(1200px 600px at 10% 10%, #8B5CF6 10%, transparent 60%),
              radial-gradient(1000px 500px at 90% 20%, #22D3EE 10%, transparent 60%),
              radial-gradient(900px 600px at 30% 80%, #34D399 10%, transparent 60%);
  filter: blur(40px) saturate(120%);
  opacity: 0.35;
  animation: gradientShift 18s ease-in-out infinite alternate;
}
@keyframes gradientShift {
  0% { transform: translate3d(0,0,0) scale(1); }
  100% { transform: translate3d(0,-10px,0) scale(1.03); }
}


Sparkles (very subtle)

Low-opacity small dots drifting slowly; keep opacity ≤ 0.15.

6) Components (shadcn/ui mapping)

Buttons

Primary: violet background, white text, glow on focus.

Secondary/Outline: transparent/glassy with border.

Danger: error color (for destructive).

Badges (chips)

intent="success" → mint; intent="warn" → amber; intent="error" → rose; intent="info" → cyan.

Always rounded-full and small (text-xs).

Cards

Glassy surface (bg-white/5 on dark), rounded-2xl, thin border, inner padding p-4 md:p-6.

Tabs

High-contrast active state (violet underline or pill), keyboard focus ring (cyan).

Tooltips/Toasts

Brief, non-blocking; max 2 lines.

7) Status & Highlighting

Inline Highlight Legend

Supported: Mint background tint with soft glow.

Unknown: Amber background tint.

Error (future): Rose background tint.

Citations

Render as glowing chips [C#] with rounded-full, px-2 py-0.5, text-xs, subtle cyan glow on hover.

Clicking a chip should scroll + glow the source chunk briefly.

8) Charts (Mini “Factuality Dashboard”)

Keep minimal: a single stacked bar (Mint vs Amber).

Height: 12px–16px, rounded-full, border white/10.

Avoid heavy chart libs; simple <div> bars or lightweight SVG.

9) Accessibility

Keyboard navigation: All interactive elements must be tabbable in a logical order.

Focus styles: visible cyan ring around focused controls.

Tooltips require aria-label or descriptive text.

Color alone must not convey status—use icons/labels where possible.

Respect prefers-reduced-motion.

10) Layout Rules

Page max width: max-w-6xl centered.

Section spacing: vertical rhythm ~ mt-6 mb-6.

Grid: 1-col mobile → 2-col on md: breakpoint.

Padding: Cards p-4 (mobile) → p-6 (md).

<div className="rounded-[1.25rem] bg-white/5 border border-white/10 p-6 shadow-[0_0_12px_rgba(139,92,246,0.0)] hover:shadow-[0_0_12px_rgba(34,211,238,0.25)] transition">
  {/* content */}
</div>

11) Intent Colors (Quick Reference)

Primary/Action: Violet #8B5CF6

Focus/Link/Info: Cyan #22D3EE

Success/Supported: Mint #34D399

Warning/Unknown: Amber #F59E0B

Error/Destructive: Rose #F43F5E

12) Do/Don’t

Do

Keep motion subtle; prioritize clarity.

Use chips and badges for compact status.

Maintain consistent paddings and radii.

Don’t

Overuse bright gradients at full opacity.

Use only color for status (add labels/icons).

Add long blocking animations.