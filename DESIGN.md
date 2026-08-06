---
name: Taurun Marketing Dashboard
description: UI Kit (Black v.1.0.1) + Obsidian Dark Mode design tokens for high-contrast, high-craft, low-clutter reporting.
colors:
  primary: "#3b82f6"
  neutral-bg: "#000000"
  neutral-card: "#0a0a0d"
  neutral-popover: "#131318"
  border-subtle: "rgba(255, 255, 255, 0.06)"
  border-strong: "rgba(255, 255, 255, 0.14)"
  success: "#10b981"
  warning: "#f59e0b"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System

## Overview
This design system, named **UI Kit (Black v.1.0.1)**, is built for a professional, high-performance, dark-themed dashboard. It emphasizes deep obsidian black layers, subtle borders, tactile physical scales on interaction, and clean typography. The goal is to provide maximum information density with zero clutter.

## Colors
- **Primary / Accent**: `#3b82f6` used for brand highlighting and primary interactive actions.
- **Obsidian Background**: `#000000` (pure black) for maximum contrast, lower screen fatigue, and perfect OLED rendering.
- **Card Material**: `#0a0a0d` (near-black) to elevate containers and organize data.
- **Popover Material**: `#131318` used for floating dropdowns, tooltips, and dialogs.
- **Borders**: Sub-6% translucent white (`rgba(255, 255, 255, 0.06)`) for container separations, raising to `rgba(255, 255, 255, 0.14)` on hover.
- **Status indicators**: Monochrome grey as default, utilizing `#10b981` (Success), `#f59e0b` (Warning), and `#ef4444` (Destructive) strictly for functional status tracking.

## Typography
- **Headings (Display/Headline)**: Rendered in *Plus Jakarta Sans* with extra-bold weight and tight tracking (`-0.03em`) for a modern, executive feel.
- **Body & Captions**: Rendered in *Plus Jakarta Sans* with normal weights and optimal readability.
- **Tabular & Code (Mono)**: Rendered in *JetBrains Mono* with `tabular-nums` formatting to align columns of numbers (such as currency and leads).
- **Kickers / Eyebrows**: Rendered in monospace, all-caps, with `letter-spacing: 0.14em` for clean metadata tagging.

## Elevation
We do not use heavy shadows. Elevation is represented by layering and border opacity transitions:
- **Level 0**: Base background (`#000000`).
- **Level 1**: Card containers (`#0a0a0d`) with a subtle `rgba(255, 255, 255, 0.06)` border.
- **Level 2 / Glass**: Floating popovers, dropdowns, and sticky headers (`#131318` or `rgba(10, 10, 13, 0.72)` with a 24px backdrop filter blur).

## Components
- **Card**: Glassmorphic or solid container with `rounded-2xl` (16px), subtle border, and background transitions on hover.
- **Sidebar & Sidebar Items**: Translucent glass menus that elevate slightly on hover and compress on press (`active:scale-[0.98]`).
- **Pills & Segments**: Deep black containers housing segments that slide or toggle background opacity (`bg-white/[0.08]` with border active `border-white/20`).

## Do's and Don'ts
- **DO** use `tabular-nums` for alignment of all numbers in tables and KPI cards.
- **DO** use the `apple-press` class (`active:scale(0.97)`) for button feedback on pointer-down.
- **DO** respect prefers-reduced-motion queries by skipping scaling transforms.
- **DON'T** use multi-color neon borders, text gradients, or excessive card rounding (>16px).
- **DON'T** pair flat white borders with shadows. Pick border lines or subtle layering, never both.
- **DON'T** introduce side-stripe accents on cards or widgets.
