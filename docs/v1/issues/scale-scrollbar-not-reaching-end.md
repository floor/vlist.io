---
created: 2026-04-03
updated: 2026-04-03
status: draft
---

# Scale + Scrollbar: dragging to the end doesn't scroll to the last items

> When `withScale({ force: true })` is active and the user drags the custom scrollbar thumb to the very bottom (or very end in horizontal mode), the content does not scroll all the way to the last items. The last rows remain partially or fully hidden.

**Status:** Open  
**Affects:** `src/features/scale/feature.ts`, `src/features/scrollbar/scrollbar.ts`, `src/builder/materialize.ts`  
**Example:** `examples/track-list` → Grid mode → Scale toggle ON → drag scrollbar to bottom

---

## The Problem

With 770 items in a 4-column grid (193 rows), enabling `withScale({ force: true })` activates compressed scroll mode. The custom scrollbar appears and wheel/touch scrolling works correctly. However, dragging the scrollbar thumb to the very bottom does not show the last items — the content appears to stop several rows short.

### Observed values from logs

```
totalRows: 193
actualSize: 48435        (total content height in px)
virtualSize: 48435       (ratio: 1, no actual compression)
containerSize: 598.875   (viewport height)
maxScroll: 47836.125     (virtualSize - containerSize)
scrollTop at bottom: 47836
```

The `scrollTop` does reach `maxScroll`, yet the last items are not visible in the viewport.

## Architecture Context

### How scale + scrollbar works

When `withScale({ force: true })` enters compressed mode:

1. **Proxy's `enableCompression()`** — Only sets a boolean flag (`$.sic = true`). Unlike the real `createScrollController.enableCompression()`, it does **not** set `overflow: hidden` or remove native scroll listeners.

2. **`setScrollFns()`** — Replaces the scroll getter/setter so all reads return `virtualScrollPosition` and all writes store to `virtualScrollPosition` (bypassing native `scrollTop`).

3. **Wheel handler** — Attached with `{ passive: false }`, calls `e.preventDefault()` to block native scroll from wheel events.

4. **Touch handlers** — Same pattern, `e.preventDefault()` on `touchmove`.

5. **Fallback scrollbar** — If `withScrollbar` feature is not present, scale creates its own `createScrollbar()` instance. The scrollbar's `onScroll` callback calls `ctx.scrollController.scrollTo(position)`.

6. **Item positioning** — Items use `transform: translateY(sizeCache.getOffset(row) - virtualScrollPosition)` when `ratio === 1`.

### The desync problem

The viewport retains `overflow: auto` (the proxy never changes it). The content div is set to `virtualSize` height (48435px). This means:

- The viewport is **natively scrollable** — `scrollTop` can change via keyboard, browser auto-scroll to focused elements, or any mechanism not intercepted by the scale feature.
- The native scrollbar is hidden via CSS (`scrollbar-width: none`), but the DOM is still scrollable.
- `virtualScrollPosition` and native `scrollTop` are **independent** — nothing keeps them in sync.

When the user scrolls via the custom scrollbar, `virtualScrollPosition` updates correctly and items are positioned via transforms relative to it. But if native `scrollTop` has drifted to any non-zero value, the viewport shows a different slice of the content div than what `virtualScrollPosition` expects. Items end up visually offset by the native scroll amount.

**Example:** If native `scrollTop` drifts to 300px (e.g. from a keyboard Page Down), and the custom scrollbar sets `virtualScrollPosition = 47836`:
- Items are positioned at `translateY(offset - 47836)` — the last row lands at ~`translateY(356)`
- But the viewport shows content from pixel 300 to 899 (native scroll offset)
- The last row at `translateY(356)` appears at visual position `356 - 300 = 56` — far from the bottom
- The bottom ~540px of the viewport is empty or shows incorrectly positioned items

## Possible native scroll drift sources

| Source | Intercepted? | Notes |
|--------|-------------|-------|
| Mouse wheel | ✅ Yes | Scale's wheel handler calls `e.preventDefault()` |
| Touch scroll | ✅ Yes | Scale's touch handler calls `e.preventDefault()` on `touchmove` |
| Keyboard (arrows, Page Down, Space) | ❌ **No** | No keyboard interception — browser scrolls natively |
| Browser auto-scroll to focused element | ❌ **No** | Clicking items may focus them, triggering browser scroll-into-view |
| `scrollIntoView()` calls | ❌ **No** | Any JS calling this on a child element |
| Selection feature focus management | ❌ **Likely** | Selection moves focus to items, which may trigger native scroll |

The selection feature is particularly suspect — it manages focus indices and may cause the browser to auto-scroll to show the focused item natively.

## Partial fix attempted (overflow: hidden)

An attempt was made to set `overflow: hidden` on the viewport when entering compressed mode:

```ts
// In enhancedUpdateCompressionMode, entering compressed mode:
const nativePos = horizontal ? dom.viewport.scrollLeft : dom.viewport.scrollTop;

if (horizontal) {
  dom.viewport.style.overflowX = "hidden";
} else {
  dom.viewport.style.overflow = "hidden";
}
if (horizontal) {
  dom.viewport.scrollLeft = 0;
} else {
  dom.viewport.scrollTop = 0;
}

// Transfer captured position to virtual scroll
if (nativePos > 0) {
  virtualScrollPosition = nativePos;
  targetScrollPosition = nativePos;
}
```

And restoring on exit:
```ts
// Leaving compressed mode:
if (horizontal) {
  dom.viewport.style.overflowX = "auto";
} else {
  dom.viewport.style.overflow = "auto";
}
```

**This did not fix the issue.** The scrollbar still doesn't reach the end. Either the overflow fix is insufficient (native scroll is not the root cause) or there is an additional problem.

## Key files

| File | Role |
|------|------|
| `src/features/scale/feature.ts` | Scale feature — manages compressed mode, virtualScrollPosition, wheel/touch handlers, fallback scrollbar creation |
| `src/features/scrollbar/scrollbar.ts` | Custom scrollbar — thumb drag math, `updateBounds()`, `updatePosition()`, `onScroll` callback |
| `src/features/scrollbar/feature.ts` | Scrollbar builder feature — wires scrollbar into `afterScroll`, `resizeHandlers`, `contentSizeHandlers` |
| `src/features/scrollbar/controller.ts` | Real scroll controller (NOT used by builder — builder uses the proxy instead) |
| `src/builder/materialize.ts` | `createDefaultScrollProxy` — lightweight proxy that does NOT manage overflow or native scroll |
| `src/builder/core.ts` | `onScrollFrame` — reads `$.sgt()`, guards against unchanged position, fires `$.rfn()` |
| `src/rendering/scale.ts` | `getCompressionState()`, `calculateCompressedItemPosition()` — pure math functions |
| `src/features/grid/feature.ts` | Grid feature — `gridRenderIfNeeded()` uses `sizeCache.indexAtOffset(scrollTop)` for visible range |
| `src/features/grid/renderer.ts` | Grid renderer — `calculateRowOffset()` calls `calculateCompressedItemPosition()` with compression context |

## Scrollbar drag math (for reference)

The scrollbar's `handleMouseMove` computes the scroll position from thumb drag delta:

```ts
const delta = mousePos(e) - dragStartPos;
const scrollRatio = maxThumbTravel > 0 ? delta / maxThumbTravel : 0;
const maxScroll = totalSize - containerSize;
const deltaScroll = scrollRatio * maxScroll;
const newPosition = Math.max(0, Math.min(dragStartScrollPosition + deltaScroll, maxScroll));
```

- `totalSize` = `compression.virtualSize` (48435 when `ratio: 1`)
- `containerSize` = `ctx.state.viewportState.containerSize` (598.875)
- `maxThumbTravel` = `containerSize - thumbSize` (568.875 with min thumb 30px)
- `maxScroll` = 47836.125

The math itself is correct — when `delta === maxThumbTravel`, `newPosition === maxScroll`. The scrollbar CAN reach the maximum value.

## What to investigate next

1. **Add diagnostic logging** to confirm whether `virtualScrollPosition` actually reaches `maxScroll` during scrollbar drag, and whether the grid's visible range includes the last row at that position.

2. **Check if the grid is rendering items** at `scrollTop = maxScroll` — log the `renderRange` and `visibleRange` at the bottom to verify rows 190–192 are included.

3. **Verify item positioning** — at `scrollTop = maxScroll`, log the actual `translateY` value for the last row. It should be `containerSize - rowHeight` (~356px). If it's different, the position calculation has an error.

4. **Check if the content div height is correct** — the content div should be `virtualSize + mainAxisPadding` px. If padding is non-zero, the scrollbar's `totalSize` might not account for it.

5. **Check `containerSize` mismatch** — the log shows both `containerHeight: 599` and `containerSize: 598.875`. If the scrollbar uses one value and the grid uses another, `maxScroll` differs and the thumb-to-position mapping is off.

6. **Inspect `enhancedUpdateCompressionMode` frequency** — it fires on every data change (async chunk load). If it runs mid-drag and calls `scrollbar.updateBounds()` with changed values, the drag math could be disrupted.

7. **Test without grid** — does the issue reproduce in list mode with scale force? If not, it's grid-specific. If yes, it's in the scale/scrollbar core.

8. **Test with `withScrollbar` enabled** — the scrollbar feature has `contentSizeHandlers` wiring that the scale fallback scrollbar lacks. Does the issue differ?

## Reproduction steps

1. Open `examples/track-list`
2. Switch to **Grid** mode
3. Toggle **Scale** ON (this enables `withScale({ force: true })`)
4. Scrollbar toggle can be OFF (scale creates its own fallback scrollbar)
5. Drag the custom scrollbar thumb to the very bottom
6. Observe: the last items (rows 191–192) are not fully visible

**Expected:** The last row should be fully visible at the bottom of the viewport.  
**Actual:** The content appears to stop several rows short of the end.

---

*Created: July 2025*  
*Related: `withScale` force mode, custom scrollbar, grid compressed positioning*