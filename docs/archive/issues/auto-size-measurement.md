# Auto-Size Measurement — Implementation Prompt (Mode B)

## Goal

Implement auto-size measurement for vlist — the last remaining item on the roadmap (#11). When enabled, vlist renders items using an estimated size, measures their actual DOM size after render, caches the result, and adjusts scroll position to prevent visual jumps.

This unlocks the "social feed" use case: variable-length user-generated text, images with unknown aspect ratios, mixed-media content — any scenario where item sizes cannot be known upfront.

## Context

### What exists today (Mode A)

Item sizes must be known before render — either a fixed number or a function:

```typescript
// Fixed size (zero-overhead fast path)
item: { height: 48, template: myTemplate }

// Variable size via function (prefix-sum SizeCache)
item: { height: (index) => items[index].type === 'header' ? 64 : 48, template: myTemplate }

// Horizontal equivalent
item: { width: 200, template: myTemplate }
```

Mode A covers the majority of use cases and is fully shipped. The `SizeCache` in `src/rendering/sizes.ts` provides O(1) offset lookup (prefix-sum) and O(log n) index-at-offset (binary search) for variable sizes.

### What Mode B adds

```typescript
// Estimated size — vlist measures after render
item: { estimatedHeight: 48, template: myTemplate }

// Horizontal equivalent
item: { estimatedWidth: 200, template: myTemplate }
```

The consumer provides a **guess**. vlist renders items using that guess for initial layout math, then measures the actual DOM size after render, caches the real size, and corrects scroll position so the user sees no jump.

## Architecture

### Overview

Mode B extends — not replaces — the existing `SizeCache`. The key insight is that a measured item becomes a **known** item. Once measured, it behaves identically to Mode A. The new work is:

1. **Detect unmeasured items** — Track which items have been measured vs estimated
2. **Measure after render** — Use `ResizeObserver` or `getBoundingClientRect()` on rendered items
3. **Update the SizeCache** — Replace estimated sizes with actual sizes
4. **Correct scroll position** — Adjust `scrollPosition` when sizes change above the viewport

### Core Data Structure: MeasuredSizeCache

Create a new `SizeCache` implementation that wraps the existing variable `SizeCache` with measurement tracking:

```typescript
interface MeasuredSizeCache extends SizeCache {
  /** Record actual measured size for an item */
  setMeasuredSize(index: number, size: number): void;

  /** Check if an item has been measured */
  isMeasured(index: number): boolean;

  /** Get the estimated size (used for unmeasured items) */
  getEstimatedSize(): number;

  /** Number of items that have been measured */
  measuredCount(): number;

  /** Rebuild prefix sums incorporating measured sizes */
  rebuild(totalItems: number): void;
}
```

Internally, this maintains:
- A `Float64Array` (or `Map<number, number>`) of measured sizes, keyed by item index
- A fallback estimated size for unmeasured items
- The same prefix-sum array as the variable `SizeCache`, rebuilt when measurements change

The size function becomes:

```typescript
const sizeFn = (index: number): number => {
  return measuredSizes.has(index) ? measuredSizes.get(index)! : estimatedSize;
};
```

This feeds directly into `createVariableSizeCache(sizeFn, total)` — all existing viewport, compression, and range calculations work unchanged.

### Measurement Strategy

#### When to measure

Measure items **after they are rendered into the DOM** — specifically, after the template has been applied and the element is in the document. The render loop in `builder/core.ts` already positions elements and applies templates. Measurement should happen:

1. **After initial render** of a batch (not per-item — batch measurements to avoid layout thrashing)
2. **After item updates** that might change size (template re-render)
3. **NOT on scroll** — only measure newly rendered items, never re-measure stable ones

#### How to measure

Two options, in order of preference:

**Option A: `ResizeObserver` (preferred)**
- Observe each rendered item element
- Callback fires asynchronously after layout with the actual size
- Naturally batched by the browser — no layout thrashing
- Works correctly with CSS transitions, fonts loading, images loading
- Disconnect observation after first measurement (item won't change size in Mode B)

**Option B: `getBoundingClientRect()` after render (fallback)**
- Synchronous, called once per render batch via `requestAnimationFrame`
- Read all sizes in a single forced layout (read-then-write pattern)
- Faster initial response but doesn't catch late layout changes (fonts, images)

Recommendation: Use `ResizeObserver` as the primary mechanism. It's supported in all modern browsers, handles async content correctly, and the browser batches observations efficiently.

#### Measurement batching

After a render cycle completes:

```
Render cycle:
  1. Calculate visible + overscan range
  2. Render new items (apply template, position with estimated size)
  3. For each newly rendered item that is NOT yet measured:
     → observe with ResizeObserver (or queue for rAF measurement)
  4. When measurements arrive:
     → Update MeasuredSizeCache with actual sizes
     → Rebuild prefix sums
     → Correct scroll position
     → Re-render if visible range changed
```

### Scroll Position Correction

This is the hardest part. When a measured size differs from the estimate, all items below shift. If the changed item is **above the viewport**, the scroll position must be adjusted to keep the currently visible content stable.

#### Algorithm

```
On measurement callback:
  1. Record old scrollPosition
  2. Record old offset of the first visible item: oldOffset = sizeCache.getOffset(firstVisibleIndex)
  3. Update measured sizes in cache
  4. Rebuild prefix sums
  5. Calculate new offset of same item: newOffset = sizeCache.getOffset(firstVisibleIndex)
  6. Delta = newOffset - oldOffset
  7. If delta !== 0:
     → Adjust scrollPosition by delta (scrollTop += delta or scrollLeft += delta)
     → This keeps the same content at the same visual position
  8. Update content size (total size changed)
  9. Re-render with corrected positions
```

#### Edge cases

- **Multiple measurements arriving in same frame** — Batch all updates, compute delta once
- **First visible item itself changed size** — Anchor to the item's top edge, not center
- **Item at index 0 changed** — No scroll correction needed (nothing above it)
- **Compressed mode** — Need to update compression ratio after size changes; the ratio-based scroll mapping handles this naturally since it reads from `sizeCache.getTotalSize()`
- **Reverse mode** — Scroll correction inverts: changes below the viewport need adjustment instead of above

### Builder Integration

Mode B should be implemented as part of the core builder (not a separate feature plugin), because it fundamentally changes how the `SizeCache` is created and how the render loop operates.

#### Config resolution in `builder/core.ts`

```typescript
const isHorizontal = config.orientation === 'horizontal';
const mainAxisProp = isHorizontal ? 'width' : 'height';
const estimatedProp = isHorizontal ? 'estimatedWidth' : 'estimatedHeight';

// Mode priority: explicit size > estimated size
const explicitSize = isHorizontal ? config.item.width : config.item.height;
const estimatedSize = isHorizontal ? config.item.estimatedWidth : config.item.estimatedHeight;

let sizeCache: SizeCache;
let measurementEnabled = false;

if (explicitSize != null) {
  // Mode A: known sizes (existing behavior)
  sizeCache = createSizeCache(explicitSize, initialTotal);
} else if (estimatedSize != null) {
  // Mode B: estimated + measured
  sizeCache = createMeasuredSizeCache(estimatedSize, initialTotal);
  measurementEnabled = true;
} else {
  throw new Error(`[vlist/builder] item.${mainAxisProp} or item.${estimatedProp} is required`);
}
```

#### Render loop changes

After rendering a batch of new items, if `measurementEnabled`:

```typescript
// After DOM batch is committed:
for (const { index, element } of newlyRenderedItems) {
  if (!measuredCache.isMeasured(index)) {
    resizeObserver.observe(element);
    // Track element → index mapping for the callback
  }
}
```

In the `ResizeObserver` callback:

```typescript
const handleResize = (entries: ResizeObserverEntry[]) => {
  let needsCorrection = false;
  const firstVisible = visibleRange.start;

  for (const entry of entries) {
    const index = getIndexFromElement(entry.target);
    const newSize = isHorizontal
      ? entry.borderBoxSize[0].inlineSize
      : entry.borderBoxSize[0].blockSize;

    if (!measuredCache.isMeasured(index)) {
      const oldSize = measuredCache.getSize(index);
      measuredCache.setMeasuredSize(index, newSize);

      if (index < firstVisible && newSize !== oldSize) {
        needsCorrection = true;
      }

      // Stop observing — size is now known
      resizeObserver.unobserve(entry.target as Element);
    }
  }

  if (needsCorrection) {
    correctScrollPosition();
  }

  // Rebuild prefix sums and re-render
  measuredCache.rebuild(total);
  updateContentSize();
  coreRenderIfNeeded();
};
```

## Files That Need Changes

### New files

| File | Purpose |
|------|---------|
| `src/rendering/measured.ts` | `MeasuredSizeCache` implementation |
| `test/rendering/measured.test.ts` | Tests for measured cache |

### Modified files

| File | Changes |
|------|---------|
| `src/types.ts` | Add `estimatedHeight` and `estimatedWidth` to `ItemConfig` |
| `src/builder/core.ts` | Config resolution, measurement wiring, `ResizeObserver`, scroll correction |
| `src/rendering/index.ts` | Export `MeasuredSizeCache` and `createMeasuredSizeCache` |
| `src/index.ts` | Export new types |

### Files that should NOT change

| File | Why |
|------|-----|
| `src/rendering/sizes.ts` | `SizeCache` interface is already correct — Mode B implements it |
| `src/rendering/viewport.ts` | Works with any `SizeCache` — no changes needed |
| `src/rendering/scale.ts` | Works with any `SizeCache` — no changes needed |
| `src/features/*` | All features consume `SizeCache` — no changes needed |

This is the power of the dimension-agnostic `SizeCache` abstraction: Mode B only needs a new implementation of the same interface. Everything downstream works unchanged.

## Type Changes

### `src/types.ts` — ItemConfig additions

```typescript
interface ItemConfig<T extends VListItem = VListItem> {
  // Existing (Mode A)
  height?: number | ((index: number, context?: GridHeightContext) => number);
  width?: number | ((index: number) => number);

  // New (Mode B)
  /** Estimated height for auto-measurement (vertical mode) */
  estimatedHeight?: number;
  /** Estimated width for auto-measurement (horizontal mode) */
  estimatedWidth?: number;

  template: ItemTemplate<T>;
}
```

### Validation rules

| Config | Mode | Behavior |
|--------|------|----------|
| `height: 48` | A (fixed) | Zero-overhead fixed SizeCache |
| `height: (i) => fn(i)` | A (variable) | Prefix-sum variable SizeCache |
| `estimatedHeight: 48` | B (measured) | MeasuredSizeCache with ResizeObserver |
| Both `height` and `estimatedHeight` | A wins | `height` takes precedence, `estimatedHeight` ignored |
| Neither | Error | Throw validation error |

Same rules apply for `width` / `estimatedWidth` in horizontal mode.

## Tests

### `test/rendering/measured.test.ts`

- `MeasuredSizeCache` returns estimated size for unmeasured items
- `setMeasuredSize` updates a specific item's size
- `isMeasured` tracks measurement state correctly
- Prefix sums rebuild after measurement updates
- `getOffset` returns correct values mixing estimated and measured sizes
- `indexAtOffset` binary search works with mixed sizes
- `getTotalSize` reflects measured sizes
- `rebuild` preserves measured sizes for existing indices
- `rebuild` discards measured sizes for removed indices (shrink)
- Edge cases: measure index 0, measure last item, measure all items, empty list

### `test/builder/measured.test.ts` (integration)

- `estimatedHeight` config creates a `MeasuredSizeCache`
- Items render with estimated sizes initially
- After measurement, items reposition with actual sizes
- Scroll position corrects when above-viewport items change size
- Content size updates after measurements
- Compressed mode works with measured sizes
- Horizontal mode works with `estimatedWidth`
- `height` takes precedence over `estimatedHeight`
- Error thrown when neither `height` nor `estimatedHeight` provided

## Implementation Order

1. **Create `src/rendering/measured.ts`** — `MeasuredSizeCache` implementing `SizeCache` interface + factory function
2. **Write `test/rendering/measured.test.ts`** — Unit tests for the cache (no DOM needed)
3. **Update `src/types.ts`** — Add `estimatedHeight` and `estimatedWidth` to `ItemConfig`
4. **Update `src/builder/core.ts`** — Config resolution (Mode A vs Mode B detection)
5. **Update `src/builder/core.ts`** — ResizeObserver setup, element tracking, measurement callback
6. **Update `src/builder/core.ts`** — Scroll position correction algorithm
7. **Update `src/rendering/index.ts`** and `src/index.ts`** — Exports
8. **Write integration tests** — Full builder tests with JSDOM + simulated measurements
9. **Test with all features** — Verify scale, sections, grid, reverse, snapshots all work
10. **Run full test suite** — All 1,578+ existing tests must still pass
11. **Build and typecheck** — `bun run build && bun run typecheck`

## Performance Considerations

### Measurement cost

`ResizeObserver` callbacks are batched by the browser and fire after layout. They do NOT cause additional forced layouts. This is the most efficient measurement approach available.

### Prefix-sum rebuild cost

After measurements arrive, prefix sums must be rebuilt: O(n). For a list of 10K items, this is ~0.1ms. For 100K items, ~1ms. This is acceptable since measurements only happen for newly rendered items (typically 10–20 per scroll stop), not on every frame.

### Memory overhead

`MeasuredSizeCache` adds a `Map<number, number>` for measured sizes. For 10K measured items: ~160 KB. For 100K: ~1.6 MB. Acceptable.

### Interaction with compression (1M+ items)

Compression reads `sizeCache.getTotalSize()` to compute the ratio. As measurements arrive, the total size changes, which changes the compression ratio. This is correct behavior — the compression naturally adapts. However, rapid ratio changes during initial scroll could cause minor visual instability. Mitigation: only update compression state after a batch of measurements completes, not per-item.

## What NOT To Do

- Do NOT modify the `SizeCache` interface — `MeasuredSizeCache` implements it
- Do NOT change viewport, scale, or feature code — they work with any `SizeCache`
- Do NOT re-measure items that have already been measured (unless data changes)
- Do NOT measure synchronously in the render loop — use `ResizeObserver` or rAF
- Do NOT skip scroll correction — this is what makes auto-measurement feel smooth
- Do NOT regress Mode A performance — `estimatedHeight` is a separate code path
- Do NOT commit without explicit permission

## Key Files to Read First

```
src/rendering/sizes.ts        ← SizeCache interface and existing implementations
src/rendering/viewport.ts     ← ViewportState, range calculations (should not change)
src/builder/core.ts           ← Main builder, render loop, where measurement wires in
src/types.ts                  ← ItemConfig where estimatedHeight/Width will be added
src/builder/dom.ts            ← DOM structure (ResizeObserver targets these elements)
```

## Related Documentation

- [Orientation](../internals/orientation.md) — Dimension-agnostic SizeCache architecture
- [Rendering](../internals/rendering.md) — How the render loop works
- [Known Issues](../resources/known-issues.md) — Item #11 (this issue)
- [Roadmap](../resources/roadmap.md) — The one remaining gap
- [Variable Heights Implementation](./variable-heights-implementation.md) — Mode A prompt (completed, for historical reference)

## Known Issue: Scroll Glitch on Measurement Flush

### Status: Fixed — Direction C implemented

### Symptom

When scrolling with the mouse wheel or touchpad, items occasionally "jump" to a different scroll position after the user stops scrolling. The glitch is less frequent than earlier iterations but still noticeable — a brief visual snap where the viewport shifts by a few pixels to several hundred pixels.

### Root Cause Analysis

The glitch was caused by the **scroll correction algorithm** that ran when deferred measurements were flushed on scroll idle. Here was the exact sequence:

```
1. User scrolls with wheel/touchpad
2. New items enter the render range, rendered WITHOUT explicit height
3. ResizeObserver fires immediately, measures real heights
4. Cache updates + prefix-sum rebuild happen immediately
   → Items reposition correctly (no visual issue here)
5. BUT: content size update + scroll correction were DEFERRED (isScrolling = true)
6. User stops scrolling → 150ms idle timeout fires
7. flushMeasurements() ran:
   a. updateContentSize() — content div height changes
   b. scrollTop += pendingScrollDelta — scroll position jumps
8. The scroll position change in step 7b was the visible glitch
```

The correction in step 7b was mathematically correct — it compensated for above-viewport items whose measured size differed from the estimated size. But the user perceived it as a sudden jump because:

- The correction could accumulate to a large delta (many items × size difference)
- It happened as a single discrete `scrollTop` change after a period of stability
- The browser applied it synchronously, causing a visible frame where content shifted

### What Was Already Tried

**Attempt 1: Measure immediately, correct immediately (original implementation)**
- Items rendered unconstrained, ResizeObserver observed immediately
- Scroll correction applied in every ResizeObserver callback
- ❌ Scrollbar drag was unstable — content size changed every frame, scrollbar proportions shifted under the user's thumb

**Attempt 2: Defer everything to scroll idle**
- Items rendered at estimated height during scrolling (constrained)
- Measurement deferred to scroll idle via `measurePendingItems()`
- ❌ Visible "snap" when items went from 120px to real height on idle — worse glitch than the original

**Attempt 3: Measure immediately, defer correction (previous implementation)**
- Items rendered unconstrained, ResizeObserver observes immediately
- Cache updates + repositioning happen immediately (items look correct)
- Content size update + scroll correction deferred to idle
- ✅ Scrollbar drag is stable
- ✅ No "snap" glitch (items show real content from the start)
- ⚠️ Scroll correction on idle still causes a jump when `pendingScrollDelta` is non-trivial

**Attempt 4: Direction C — correct during scroll, defer only content size (current implementation) ✅**
- Items rendered unconstrained, ResizeObserver observes immediately
- Cache updates + repositioning happen immediately
- **Scroll correction applied immediately** in the ResizeObserver callback (even during scrolling)
- Content size update still deferred to idle (keeps scrollbar stable)
- ✅ Scrollbar drag is stable (content size doesn't change during scroll)
- ✅ No "snap" glitch (items show real content from the start)
- ✅ No idle jump (scroll corrections are small per-batch and masked by user's own scroll motion)

### Investigation Directions (Historical)

#### Direction A: Amortize scroll correction over multiple frames

Instead of applying the full `pendingScrollDelta` in one shot, animate it over 3–5 frames using `requestAnimationFrame`. This makes the correction feel like a smooth micro-adjustment rather than a jump.

```typescript
// Concept: smooth correction over N frames
const smoothCorrect = (delta: number, frames = 5) => {
  const step = delta / frames;
  let remaining = frames;
  const tick = () => {
    const currentScroll = $.sgt();
    $.sst(currentScroll + step);
    $.ls = currentScroll + step;
    if (--remaining > 0) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
```

**Pros:** Simple, no architectural change, just perception improvement.
**Cons:** Still moves the viewport — user might notice during reading. May interact badly with subsequent scroll input.

#### Direction B: Anchor to the first visible item (visual anchor)

Instead of adjusting `scrollTop` by a delta, compute the desired scroll position from the first visible item's new offset. This anchors the viewport to a specific item rather than a numeric correction.

```typescript
// Concept: anchor-based correction
const firstVisibleIndex = visibleRange.start;
const oldOffset = /* saved before rebuild */;
const newOffset = measuredCache.getOffset(firstVisibleIndex);
const correction = newOffset - oldOffset;
if (Math.abs(correction) > 0) {
  $.sst($.sgt() + correction);
  $.ls = $.sgt();
}
```

**Pros:** More semantically correct — anchors to what the user is looking at.
**Cons:** Need to save oldOffset before each rebuild. The fundamental problem (discrete scroll change) remains.

#### Direction C: Correct during scroll, not on idle ✅ IMPLEMENTED

Apply scroll correction immediately in the ResizeObserver callback (even during scrolling), but still defer `updateContentSize()`. The hypothesis: the user won't notice small per-item corrections during active scrolling because their own input creates continuous scroll movement that masks the corrections.

```typescript
// In ResizeObserver callback:
// Always correct scroll immediately
if (pendingScrollDelta !== 0) {
$.sst($.sgt() + pendingScrollDelta);
$.ls += pendingScrollDelta;
pendingScrollDelta = 0;
}
// But still defer content size update
if (isScrolling) {
  pendingContentSizeUpdate = true;
} else {
  updateContentSize();
}
```

**Pros:** Corrections are small (per-item, not accumulated) and hidden by scroll motion. No large flush on idle.
**Cons:** May cause subtle drift. Need to verify scrollbar stability (content size is still deferred, so scrollbar should be fine).

#### Direction D: Update estimated size dynamically

As measurements come in, adjust the estimated size for unmeasured items to the running average of measured sizes. This minimizes the delta between estimated and actual sizes, reducing the total correction needed.

```typescript
// Concept: dynamic estimate
const totalMeasured = measuredCache.measuredCount();
const avgMeasuredSize = totalMeasuredHeight / totalMeasured;
// Use avgMeasuredSize instead of original estimatedSize for unmeasured items
```

**Pros:** Reduces correction magnitude over time. After measuring ~50 items, the estimate is very close to reality.
**Cons:** Requires changes to `MeasuredSizeCache` (dynamic estimated size). Prefix sums change for all unmeasured items on every update — O(n) rebuild cost. Content size still changes (but by smaller amounts).

#### Direction E: Two-phase content size (speculative)

Maintain two content sizes: a "display" size (used for the scrollbar) and a "real" size (used for positioning). The display size only updates on idle, keeping the scrollbar stable. The real size updates immediately, keeping item positions correct. The gap between them is absorbed by a small buffer zone at the bottom of the content area.

**Pros:** Complete decoupling of scrollbar stability from measurement correctness.
**Cons:** Complex. May cause edge cases near the bottom of the list where the two sizes diverge.

### Resolution

**Direction C was implemented** and resolves the scroll glitch. The per-batch corrections during scroll are invisible to the user because:
1. Each correction is small (one batch of items' size difference)
2. The user's own scroll input creates continuous motion that masks it
3. The scrollbar stays stable because `updateContentSize()` is still deferred

If Direction C proves insufficient in edge cases, **Direction D** (dynamic estimate) can be combined to minimize correction magnitude. Direction A (animated correction) is a fallback option.

### Current Implementation State

| Component | File | Status |
|-----------|------|--------|
| `MeasuredSizeCache` | `src/rendering/measured.ts` | ✅ Complete (57 tests) |
| `ItemConfig` types | `src/types.ts` | ✅ Complete |
| Config resolution | `src/builder/core.ts` | ✅ Complete |
| ResizeObserver wiring | `src/builder/core.ts` | ✅ Complete |
| Scroll correction | `src/builder/core.ts` | ✅ Fixed (Direction C) |
| Exports | `src/rendering/index.ts`, `src/index.ts` | ✅ Complete |
| Unit tests | `test/rendering/measured.test.ts` | ✅ 57 tests passing |
| Integration tests | `test/builder/measured.test.ts` | ❌ Not yet written |
| Example | `vlist.dev/examples/auto-size/` | ✅ Complete (social feed) |
| All existing tests | | ✅ 1,635 tests passing |

---

## Related Documentation

- [Orientation](../internals/orientation.md) — Dimension-agnostic SizeCache architecture
- [Rendering](../internals/rendering.md) — How the render loop works
- [Known Issues](../resources/known-issues.md) — Item #11 (this issue)
- [Roadmap](../resources/roadmap.md) — The one remaining gap
- [Variable Heights Implementation](./variable-heights-implementation.md) — Mode A prompt (completed, for historical reference)

---

*Created: February 2026*
*Updated: July 2025 — Mode B implemented, scroll glitch fixed via Direction C*
*Status: Implemented — scroll correction glitch resolved*
*Priority: Low (Mode A covers the majority of production use cases)*