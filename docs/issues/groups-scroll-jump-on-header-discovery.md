---
created: 2026-05-09
updated: 2026-05-09
status: open
---

# Scrollbar jumps when groups discovers new headers during async loading

> When scrolling a large grouped async list, the scrollbar occasionally
> jumps to a completely different position. The jump occurs when the
> async feature loads a new batch of items and the groups feature
> discovers new group headers in that batch. The scroll adjustment
> overshoots massively — in the observed case, jumping -230K pixels
> on a ~1M scroll position.

**Status:** Open
**Affects:** `src/features/groups/feature.ts` (L832–877 — scroll adjustment in `onItemsLoaded`)
**Reproduction:** Grouped async list with `withScale` — scroll past the initially loaded region, wait for new items to load

---

## Symptoms

```
[GROUPS scroll adjust] 1009713 -> 779315 (delta=-230398) dataIdx=7788 layoutIdx=7803 +16hdr total=10790->10806 anchor=true
[ASYNC onItemsLoaded] scroll 1009713 -> 779315 (delta=-230398) offset=10080 count=30
[GROUPS scroll adjust] 779315 -> 779315 (delta=0) dataIdx=7788 layoutIdx=7803 +25hdr total=10806->10831 anchor=true
```

The scrollbar visibly jumps backward when a batch of 30 items loads at
offset 10080. The adjustment targets `dataIdx=7788` even though the
user has scrolled far past that item (`scrollBefore=1,009,713`).

---

## Root cause: stale `_restoreAnchor`

The groups feature's scroll adjustment in `onItemsLoaded` (L798–802)
checks for a `_restoreAnchor` method on the context:

```typescript
const restoreAnchor = ctx.methods.get("_restoreAnchor") as
  | { dataIndex: number; fraction: number; skipAdjust?: boolean }
  | undefined;
if (restoreAnchor) {
  dataIndexAtScroll = restoreAnchor.dataIndex;
  fractionInItem = restoreAnchor.fraction;
}
```

This anchor is set by the **snapshots feature** during restore
(`snapshots/feature.ts:372`) and tells the groups feature: "anchor
the scroll adjustment to this specific data item so headers don't
shift the viewport away from the restored content."

The problem: **the anchor is never cleared as long as new headers
keep being discovered.** The cleanup only runs when `newHeaders <= 0`
(L867–876):

```typescript
} else if (restoreAnchor) {
  // No new headers — groups discovery settled for this viewport.
  ctx.methods.delete("_restoreAnchor");
```

In a grouped async list, every new batch of items at a new scroll
region is likely to contain items from new groups, so `newHeaders > 0`
is true for nearly every `onItemsLoaded` call. The anchor persists
indefinitely.

### The failure sequence

1. Page loads → snapshots restore scroll to `dataIdx=7788`
2. `_restoreAnchor = { dataIndex: 7788, fraction: 0.x }` is set
3. First few `onItemsLoaded` calls: headers discovered, anchor used
   correctly — scroll stays at the restored position
4. **User scrolls far away** from item 7788 (to scroll position ~1M)
5. New items load at the user's current viewport (offset ~10080)
6. Groups discovers 16 new headers → `newHeaders > 0`
7. Groups uses the **stale anchor** (`dataIdx=7788`) instead of the
   current scroll position to compute the adjustment
8. The adjustment targets item 7788's offset (~779K) instead of the
   current position (~1M) → **scroll jumps -230K pixels**

### Why the delta is so large

Without the stale anchor, the adjustment code at L804–812 would
compute `dataIndexAtScroll` from the current scroll position, and
the new offset would differ from `scrollBefore` by only the
displacement from newly inserted headers (a few hundred pixels at
most). But with the stale anchor, it targets an item that's ~25%
of the list away from the current viewport.

---

## Contributing factor: stale compression cache

A secondary issue compounds the problem in compressed mode. After
`rebuildSizeCache(bridge.totalEntries)` at L827, the code gets the
compression state at L830:

```typescript
ctx.rebuildSizeCache(bridge.totalEntries);
const compression = ctx.getCachedCompression();
```

But `getCachedCompression()` returns a **cached** compression state
that was computed during the last `updateCompressionMode()` call
(triggered by async's `onStateChange`, not `onItemsLoaded`). The
groups callback never calls `updateCompressionMode()` after
rebuilding the size cache, so the cached ratio may be stale.

If the sizeCache total changed significantly between the last
`onStateChange` and the current `onItemsLoaded`:
- The old `ratio = MAX_VIRTUAL_SIZE / oldActualSize`
- The correct `ratio = MAX_VIRTUAL_SIZE / newActualSize`
- `newScroll = newActualOffset * oldRatio` instead of `* newRatio`

This amplifies the jump when compression is active. The adjustment
should use a freshly computed compression state, or at minimum call
`updateCompressionMode()` after `rebuildSizeCache()`.

---

## Fix directions

### Fix 1: Clear anchor on user-initiated scroll (recommended)

The `_restoreAnchor` should be cleared when the user scrolls away
from the restored position. The scale feature's wheel/touch handlers
are the entry point for user-initiated scroll. Adding a cleanup hook:

```typescript
// In groups feature — register an afterScroll handler that invalidates
// the anchor when scroll moves beyond the anchor's expected position
ctx.afterScroll.push((scrollPosition: number) => {
  const anchor = ctx.methods.get("_restoreAnchor");
  if (!anchor) return;
  const expectedLayout = bridge.dataToLayoutIndex(anchor.dataIndex);
  const expectedOffset = ctx.sizeCache.getOffset(expectedLayout);
  const compression = ctx.getCachedCompression();
  const expectedScroll = compression.ratio !== 1
    ? expectedOffset * compression.ratio
    : expectedOffset;
  if (Math.abs(scrollPosition - expectedScroll) > ctx.state.viewportState.containerSize * 2) {
    ctx.methods.delete("_restoreAnchor");
    ctx.methods.delete("_suppressSave");
  }
});
```

This clears the anchor if the user scrolls more than 2 viewports
away from the anchored item.

### Fix 2: Clear anchor after first successful adjustment

Simpler but less precise — clear `_restoreAnchor` after the first
`onItemsLoaded` that successfully adjusts scroll (L855–858):

```typescript
if (Math.abs(newScroll - scrollBefore) > 1) {
  ctx.scrollController.scrollTo(newScroll);
}
ctx.methods.delete("_restoreAnchor");
```

Risk: if multiple batches load during the initial restore (e.g.,
items at offset 0, then 30, then 60), subsequent batches that
discover new headers above the anchor item won't benefit from the
anchor-based adjustment. The scroll-position-based fallback would
handle this but may accumulate small drift.

### Fix 3: Update compression after rebuildSizeCache

Regardless of the anchor fix, the groups callback should refresh
the compression state after rebuilding the size cache:

```typescript
ctx.rebuildSizeCache(bridge.totalEntries);
ctx.updateCompressionMode();    // ← add this
const compression = ctx.getCachedCompression();
```

This ensures the adjustment uses the correct compression ratio
for the current layout.

---

## Key files

| File | Role |
|------|------|
| `src/features/groups/feature.ts` L783–877 | `onItemsLoaded` callback with scroll adjustment |
| `src/features/snapshots/feature.ts` L370–379 | Sets `_restoreAnchor` during restore |
| `src/features/async/feature.ts` L198–237 | `onStateChange` / `onItemsLoaded` — triggers groups callback |
| `src/features/scale/feature.ts` L778–784 | `getCachedCompression` override |
| `src/rendering/scale.ts` L58–74 | `getCompressionState` — ratio computation |

---

*Created: 2026-05-09*
*Related: `withGroups` async bridge, `withSnapshots` restore anchor, `withScale` compression*
