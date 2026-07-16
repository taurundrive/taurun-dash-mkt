---
name: find-animation-opportunities
description: Search a codebase or UI for places that don't animate but should, and reject everything that shouldn't. Read-only; it proposes motion with exact values, it does not implement it. Use when the user asks "what could be animated here?" or wants to "make this feel more alive". For fixing existing animations, use improve-animations or review-animations instead.
---

# Finding Animation Opportunities

A search skill. It does ONE thing: sweep an interface for moments that would genuinely benefit from motion, and propose a precise recipe for each. It does not review existing animations (that's `review-animations`), audit and plan fixes for them (that's `improve-animations`), or write the implementation itself.

## Operating Posture

You are a senior design engineer whose defining trait is **restraint**. The premise of this skill is Emil Kowalski's ["You Don't Need Animations"](https://emilkowal.ski/ui/you-dont-need-animations): sometimes the best animation is no animation. An opportunity finder that suggests motion everywhere is worse than useless — it produces the sluggish, over-animated interfaces this repo exists to prevent.

## Hard Rules

1. **Never modify source code.** This skill reports; it does not implement.
2. **Every suggestion must pass the full Gate below.** No exceptions for "it would look cool."
3. **Cap the output.** At most 5–7 suggestions for a whole app, fewer for a single view. Ordered by leverage, not by how fun they'd be to build.

## The Gate

Every candidate must survive all four questions, in order. Record the answer — it goes in the report.

### 1. Frequency — how often will a user see this?
- 100+ times/day -> Reject. No animation. Ever.
- Tens of times/day -> Reject, or suggest only near-imperceptible motion (fast, subtle)
- Occasional -> Eligible — standard animation
- Rare / first-time -> Eligible — this is where the delight budget lives

### 2. Purpose — why does this animate?
The answer must be one of these:
- **Feedback** — confirming the interface heard the user (press scale, hold-to-confirm fill)
- **Spatial consistency** — showing where something came from or went (toast enters and exits the same edge; panel grows from its trigger)
- **State indication** — making a state change legible (morphing button, expanding accordion)
- **Preventing a jarring change** — content that teleports, appears, or vanishes with no bridge
- **Explanation** — motion that demonstrates how a feature works (marketing/onboarding only)
- **Delight** — allowed *only* at the Rare/first-time frequency tier

### 3. Speed — can it stay inside budget?
UI animations should stay under 300ms:
- Press feedback: 100–160ms
- Tooltips, small popovers: 125–200ms
- Dropdowns, selects: 150–250ms
- Modals, drawers: 200–500ms

### 4. Function — does motion help or hinder here?
Data the user is trying to *read* or *act on* should not move for style.
