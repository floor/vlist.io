# Issue: getVisibleRange() visible count off-by-one

> The footer stat `X / N items` shows 1 extra item compared to what's actually
> visible on screen, and the count changes inconsistently when scrolling.

**Status:** ✅ Resolved (in stats.js, not vlist core)
**Priority:** Low
**Affects:** `vlist.dev/examples/stats.js`
**Related:** all examples using `stats.js` footer, `getVisibleRange()` public API

---

## Problem

The `getVisibleRange()` public API returns a range whose item count is off by 1
in certain scroll positions. For a 600px container with 48px fixed-height items:

- **On reload (scroll 0):** footer shows **14** instead of **13** (12 full + 1 partial)
- **After scrolling 2px:** jumps to **15** and stays there
- **Expected:** cumulative items from the start, incrementing as new items scroll into view

## Root Cause Analysis

The visible range calculation in vlist uses `Math.ceil(containerSize / itemSize)`
which can overcount by 1 depending on scroll offset. However, fixing this in
vlist core (`countVisibleItems`, `calcVisibleRange`, `calculateCompressedVisibleRange`)
would add complexity to hot-path functions that every feature (table, grid,
masonry) would need to adapt — all for a presentation concern in the stats footer.

## Resolution

**Decision:** Don't add complexity to vlist core for an external footer display.

The fix was applied in `stats.js` only: instead of showing `visibleRange.end - visibleRange.start + 1`
(the visible count, which fluctuates with scroll position), the footer now shows
`visibleRange.end + 1` — the cumulative count of all items from index 0 through
the last visible item. This is:

- Simpler to understand (items seen from the start)
- Always increasing as you scroll down
- Precise without needing sub-pixel scroll offset calculations
- Zero changes to vlist core

### Changes

- `vlist.dev/examples/stats.js` — `update()` now reads `range.end + 1` from
  `getVisibleRange()` for both the item count display and progress percentage.
  The `onRange()` callback no longer tracks `rangeEnd` from the render range
  (which included overscan); it just triggers a `scheduleUpdate()`.

### What was NOT changed

- `vlist/src/rendering/sizes.ts` — `countVisibleItems()` unchanged
- `vlist/src/builder/range.ts` — `calcVisibleRange()` unchanged
- `vlist/src/rendering/scale.ts` — `calculateCompressedVisibleRange()` unchanged
- All 2719 vlist tests remain untouched and passing