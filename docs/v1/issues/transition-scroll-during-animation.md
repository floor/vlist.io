---
created: 2026-05-17
updated: 2026-05-17
status: open
---

# Transition: scrolling during removal animation causes visual holes

> When the user scrolls during a batch removal animation, the list renders with gaps/holes because clones are positioned at pre-removal offsets that don't track scroll changes.

**Status:** 🟡 Open (mitigated by capping duration to 1s)  
**Affects:** `src/features/transition/feature.ts`  
**Example:** `examples/track-list` → select multiple items → Delete → scroll during animation

---

## Problem

After `removeItems()` fires, the data is already removed and `forceRender()` has repositioned items at their post-removal offsets. Clones of the deleted items animate at fixed transform positions based on pre-removal offsets. When the user scrolls during the animation:

- Real items re-render at correct post-removal positions for the new scroll offset
- Clones remain at their original transform positions (they don't track scroll)
- This creates visible gaps between clones and real items

## Attempted Fix

Added a scroll listener during animations to finalize (snap to final state) on user scroll. The listener was intended to cancel the animation when the user scrolls, since user interaction should trump decorative animation.

**Result:** The listener also caught programmatic/layout-triggered scroll events from `forceRender()` (content height change causes the browser to fire scroll events asynchronously), which immediately cancelled the animation before it could play. Both immediate attachment and rAF-deferred attachment failed — the browser's scroll event timing was unpredictable.

## Current Mitigation

Duration is clamped to `MAX_DURATION = 1000` ms in `resolveTiming()`. At realistic durations (200–400ms), users cannot scroll fast enough to see the holes. The issue only manifests at artificially long durations (e.g., 10s for debugging).

## Possible Future Fix

- Track scroll position delta and only finalize when the delta exceeds a threshold — but the browser's async scroll events from layout changes can produce significant deltas too (e.g., removing many items near the bottom)
- Listen for `wheel` + `touchmove` instead of `scroll` to only catch user-initiated scroll — but misses scrollbar dragging
- Make clones scroll-aware by updating their transforms on each scroll frame — complex and adds hot-path cost
