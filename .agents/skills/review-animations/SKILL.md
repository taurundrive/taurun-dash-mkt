---
name: review-animations
description: Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy. Default to flagging; approval is earned.
---

# Reviewing Animations

A specialized review skill against a high craft bar derived from Emil Kowalski's design engineering philosophy (`animations.dev`).

## Review Format (Required)

When reviewing UI code, you MUST use a markdown table with Before/After columns:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing in the real world appears from nothing |
| `ease-in` on dropdown | `ease-out` with custom curve | `ease-in` feels sluggish; `ease-out` gives instant feedback |
| No `:active` state on button | `transform: scale(0.97)` on `:active` | Buttons must feel responsive to press |

## The Ten Non-Negotiable Standards

1. **Justified motion.** Every animation must answer "why does this animate?" — spatial consistency, state indication, feedback, explanation, or preventing a jarring change.
2. **Frequency-appropriate.** Keyboard-initiated and 100+/day actions get no animation. Tens/day gets reduced motion. Occasional gets standard. Rare/first-time can have delight.
3. **Responsive easing.** Entering/exiting elements use `ease-out` or a strong custom curve. `ease-in` on UI is a block.
4. **Sub-300ms UI.** UI animations stay under 300ms; anything slower on a UI element needs justification.
5. **Origin & physical correctness.** Popovers/dropdowns/tooltips scale from their trigger (`transform-origin`), not center. Never animate from `scale(0)` — start from `scale(0.95)` + opacity.
6. **Interruptibility.** Rapidly-triggered or gesture-driven motion must be interruptible — CSS transitions or springs that retarget from current state.
7. **GPU-only properties.** Animate `transform` and `opacity` only. Animating layout properties (`width`, `height`, `margin`) is a performance violation.
8. **Accessibility.** `prefers-reduced-motion` must be honored (keep opacity/color, drop physical movement).
9. **Asymmetric enter/exit.** Deliberate actions animate slower; system responses snap.
10. **Cohesion.** Motion matches the component's personality and the rest of the product.
