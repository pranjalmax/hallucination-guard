# Hallucination Guard — Design & UX Notes

This document explains the **visual system, interaction patterns, and UX decisions** behind Hallucination Guard.

It’s written for:

- Designers / PMs who want to understand the experience.
- Engineers / recruiters who want to see how I think about product polish.

---

## Design Goals

1. **“Serious AI” look without gimmicks**
   - Dark, focused, low-noise.
   - Neon accents used sparingly to signal interactivity / state.
2. **Make trust & grounding visible**
   - Always show *why* something is tagged supported/unknown.
   - Clear path from claim → evidence → report.
3. **Guide the user**
   - Obvious 3-step flow: **Review → Sources → Report**.
   - No walls of settings. One focused track.
4. **Stay light-weight**
   - No heavy illustrations or frameworks.
   - Layout and components are mostly Tailwind + small primitives.

---

## Layout & Information Architecture

### Global Structure

- **Top bar**
  - App title + tagline.
  - Pill buttons: “Zero Cost”, “Client-Side Only”, “No Backend”.
  - GitHub link.
- **Tabs**
  - Centered: `Review | Sources | Report`.
  - Communicates the mental model:
    1. Check an answer.
    2. Manage sources.
    3. Export / share findings.

### Review Tab

Left: **Answer Editor**

- Large textarea, clear placeholder.
- `Extract Claims` is primary action.
- Legend: green dot (Supported), amber dot (Unknown/Pending).
- Below: `AnswerHighlighter` renders colored spans + small `[C]` chips.

Right: **Claims & Evidence**

- List of claims:
  - Status badge (supported / unknown / pending).
  - Type chip (DATE / NUMBER / ENTITY / QUOTED).
  - “View evidence” CTA.
- Evidence panel:
  - Shows retrieved chunks with similarity & overlap.
  - Goal: “you can manually audit this in 5 seconds”.

### Sources Tab

Left: **Ingest**

- Upload PDF control.
- Paste text area.
- Two buttons:
  - `Ingest & Save`
  - `Clear local data`
- Storage meter:
  - Visualizes browser storage usage.
  - Text explicitly mentions IndexedDB.

Right: **Documents + Embeddings + Search**

- Document dropdown + Delete button.
- Keyword filter for chunks.
- Scrollable chunk cards.
- Embeddings card:
  - Shows whether vectors exist.
  - `Compute Embeddings` / `Recompute` button.
  - Status text (“Model ready”, progress, etc.).
- Semantic search:
  - Query input + “Search”.
  - Shows best-matching chunks.

### Report Tab

- **Claims table**
  - `# | Status | Claim | Cites`.
- **Factuality bar**
  - Simple bar: supported vs unknown.
- **Fix Draft**
  - Shows grounded revision (template-based when no model).
- **Diff-ish block**
  - Highlights removed vs added content at a glance.
- **Actions**
  - `Copy Markdown`
  - `Download JSON`
- **References**
  - `[C0]`, `[C1]` style chips for source chunks.

---

## Visual System

### Color Tokens

(implemented via Tailwind classes and CSS variables)

- **Base**
  - Background: `#0B0F19`
  - Card: `#0F172A`
  - Text muted: `#94A3B8`
- **Accents**
  - Neon violet: `#8B5CF6` (primary buttons, glow)
  - Electric cyan: `#22D3EE` (secondary highlights)
  - Mint: `#34D399` (supported / success)
  - Amber: `#F59E0B` (unknown / warning)
  - Red: `#F43F5E` (errors, potential contradictions)
- **Radiuses**
  - Cards: `1.25rem`
  - Chips / pills: full (`9999px`)
- **Shadows / Glows**
  - Soft, blurred glows in accent colors on hover/focus.
  - Used for:
    - Primary CTAs
    - Status dots
    - Toasts

### Typography

- **Inter** (400/600) for UI and body.
- **JetBrains Mono** for any code-like elements (diff, references).
- Sizes:
  - 16px base, 24–32px for headings.
  - 11–13px for meta labels / chips.

---

## Motion & Micro-interactions

All motion is small, purposeful, implemented with **Framer Motion**.

Guidelines:

- **Durations**
  - Hovers / taps: 180–240ms.
  - Card entrances: 400–600ms.
- **Patterns**
  - Subtle upward lift & fade-in for cards on first load.
  - Scale/opacity pop for toasts.
  - Smooth scroll for “Back to top”.
- **Accessibility**
  - System `prefers-reduced-motion` respected where appropriate.
  - Motion never blocks interaction.

Examples:

- Claim rows slide/fade into view.
- Toasts appear top-right with a soft glow.
- Back-to-top button only appears after scrolling, sits bottom-right.

---

## Components & Reuse

A few components define the “AI look” so the rest stays simple:

- `GradientBG`
  - Full-page gradient mesh with faint particles.
  - Runs under everything; zero logic.

- `NavBar`
  - Logo mark + app name.
  - Pills for constraints (Zero Cost, Client-Side).
  - GitHub shortcut.

- `Card`, `Button`, `Badge` (from shadcn-style)
  - Themed with the color tokens, used everywhere.
  - Ensures visual consistency across Review/Sources/Report.

- `Toaster` + `use-toast`
  - Small internal toast system.
  - Used for ingest success, errors, embedding status, report actions.

Result: **most “wow” comes from 2–3 shared components**, not from sprinkling complex styles everywhere.

---

## UX & Copy Choices

- Language is **plain and honest**:
  - “No Backend”, “Zero Cost”, “Client-Side Only”.
  - Describes what the tool *can* and *cannot* promise.
- Guidance is inline:
  - Status text near buttons (e.g., embedding progress).
  - One primary action visible per section.
- Error states:
  - Surface as toasts + short text (e.g., missing embeddings, model load issues).
  - Prefer helpful explanations over generic “something went wrong”.

---

## What This Demonstrates

For anyone skimming this repo:

- I can define a **visual language** that matches a domain (AI tooling) without overdoing it.
- I care about:
  - hierarchy,
  - legibility,
  - meaningful motion,
  - and copy that helps non-experts.
- I design UI and architecture **together**:
  - The 3-tab layout mirrors the actual data flow.
  - The components map directly to concepts in the system.

If you want to see exactly how the system fits together technically, see [`architecture.md`](./architecture.md).  
If you want to see it in action, open the live demo and follow the steps in the main [`README.md`](../README.md).
