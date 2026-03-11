# Async: `removeItem` — sparse storage shift, re-render & gap refill

> Fixed. Deleting items via `removeItem(id)` in async mode now correctly shifts sparse storage, forces a DOM re-render, and refills chunk-boundary gaps via a debounced adapter fetch.

**Status:** ✅ Resolved  
**Commits:** `7da9deb` (initial shift implementation), follow-up (optimize + re-render + gap refill)  
**Affects:** `src/builder/api.ts`, `src/features/async/manager.ts`, `src/features/async/sparse.ts`, `src/features/selection/feature.ts`  
**Example:** `examples/track-list` → select a track → Delete Selected

---

## Original Problem

When using `withAsync` (adapter-backed sparse storage), calling `list.removeItem(trackId)` produced broken visual results:

1. The deleted item's slot showed a **placeholder** (masked text like `xxxxxxxxx`)
2. The list total decreased by 1, but items didn't shift — so the **last item disappeared**
3. The `idToIndex` map became stale for all items after the deleted one
4. Consecutive deletions accumulated placeholder items at the tail of the visible area

### Visual symptom (before fix)

Before deletion: `[A, B, C, D, E]` (total=5)  
After deleting B: `[A, placeholder, C, D]` (total=4) — B's slot was a hole, E was gone

### Expected behavior

After deleting B: `[A, C, D, E]` (total=4) — items shift down, no placeholders

---

## Three Problems & Their Fixes

### Problem 1: Sparse storage didn't shift items

`storage.delete(index)` only set the slot to `undefined` (punching a hole) without shifting subsequent items down. The total was decremented, so the last item fell off the end.

**Fix in `sparse.ts` — `deleteItem()`:**

Rewrote the shift algorithm to be **O(cachedItems)** instead of O(totalItems). The old implementation iterated from the deleted index to `totalItems - 1` — for a 300K-item list with ~50 cached items, that was ~300K iterations mostly hitting empty slots.

The new algorithm:

1. Collect all loaded items at indices > deleted index by scanning only loaded chunks
2. Clear the deleted item and all collected items from their current positions
3. Re-insert each collected item at `(originalIndex - 1)`
4. Decrement `totalItems`

```js
// Collect loaded items from affected chunks only — O(cachedItems)
const sortedChunkKeys = Array.from(chunks.keys())
  .filter(k => k >= deletedChunkIdx)
  .sort((a, b) => a - b);

const shifted = [];
for (const ci of sortedChunkKeys) {
  const c = chunks.get(ci);
  const base = ci * chunkSize;
  for (let s = 0; s < chunkSize; s++) {
    if (c.items[s] === undefined) continue;
    const itemIndex = base + s;
    if (itemIndex <= index) continue;
    shifted.push({ oldIndex: itemIndex, item: c.items[s] });
  }
}

// Clear all, then re-insert at (oldIndex - 1)
// ... (handles chunk.count, cachedItemCount, chunk cleanup)
```

This correctly handles:
- Shifts within a single chunk
- Shifts across chunk boundaries (item moves from chunk N slot 0 → chunk N-1 last slot)
- Holes in the middle of loaded ranges (holes shift down too)
- Multiple sequential deletions

**Fix in `manager.ts` — `removeItem()`:**

Cleaned up to rely on the new `storage.delete()` behavior:

```js
const removeItem = (id) => {
  const index = idToIndex.get(id);
  if (index === undefined) return false;

  const deleted = storage.delete(index);  // shifts items internally
  if (!deleted) return false;

  rebuildIdIndex();      // all indices after deleted one changed
  activeLoads.clear();   // stale range keys after shift
  notifyStateChange();   // triggers sizeCache rebuild + re-render
  return true;
};
```

### Problem 2: DOM not updated when render range unchanged

After deletion, `notifyStateChange()` triggers the feature-level `onStateChange` callback, which calls `ctx.renderIfNeeded()`. But `renderIfNeeded` has an optimization: it bails when `renderRange.start === lastRenderRange.start && renderRange.end === lastRenderRange.end`. After deleting a visible item, the range indices (e.g. 0–15) often stay the same — but the *items at those indices* have shifted. The DOM showed stale data.

**Fix in `api.ts` — `removeItem()`:**

Call `ctx.forceRender()` after a successful removal. This invalidates the cached render range, forcing a full DOM reconciliation that picks up the shifted items:

```js
const removeItem = (id) => {
  const result = ctx.dataManager.removeItem(id);
  if (result) {
    emitter.emit("data:change", { type: "remove", id });
    ctx.forceRender();
    // ... ensureRange (see below)
  }
  return result;
};
```

### Problem 3: Chunk-boundary gaps never refilled

When deletion shifts items across chunk boundaries, the last slot(s) of the loaded range become empty. For example, with `chunkSize=25` and items 0–24 loaded: deleting index 5 shifts items 6–24 to 5–23, but index 24 needs the item from index 25 which lives in an unloaded chunk. Index 24 becomes a gap rendered as a placeholder.

The loading pipeline only triggers `ensureRange` on scroll events (`afterScroll`). Without scrolling after deletion, gaps persist forever. Each consecutive deletion lost one more item at the tail.

**Fix in `api.ts` — debounced `ensureRange`:**

After removal, schedule `ensureRange` for the current render range via `queueMicrotask`. The microtask coalesces multiple synchronous deletions (e.g. deleting 5 items in a `forEach` loop) into a single adapter fetch:

```js
let ensureRangePending = false;

const removeItem = (id) => {
  const result = ctx.dataManager.removeItem(id);
  if (result) {
    emitter.emit("data:change", { type: "remove", id });
    ctx.forceRender();

    if (!ensureRangePending) {
      const dm = ctx.dataManager;
      if (typeof dm.ensureRange === "function") {
        ensureRangePending = true;
        queueMicrotask(() => {
          ensureRangePending = false;
          const { start, end } = ctx.state.viewportState.renderRange;
          if (end >= start) {
            dm.ensureRange(start, end).catch(() => {});
          }
        });
      }
    }
  }
  return result;
};
```

Why debounce: each `removeItem` call internally does `activeLoads.clear()`, which orphans any in-flight `ensureRange` request. Without debouncing, deleting 5 items fires 5 overlapping requests where each nukes the previous. The microtask fires once after the synchronous deletion loop completes, reading the final render range.

---

## Additional Cleanup

### Selection feature (`selection/feature.ts`)

- `rebuildIdIndex()` — removed unused `reason` parameter, removed placeholder warning log
- `data:change` handler — removed debug logs
- `getSelectedItems()` — simplified to single expression

### Debug log removal

Removed all `console.log` statements added during development from:
- `manager.ts` — `removeItem` (7 log statements)
- `sparse.ts` — `deleteItem` (7 log statements + snapshot dump loop)
- `selection/feature.ts` — `rebuildIdIndex`, `data:change`, `getSelectedItems` (8 log statements)
- `examples/track-list/script.js` — `deleteSelected` (10 log statements)

Bundle size impact: 99.9 KB → 98.0 KB (−1.9 KB minified).

---

## Design Decisions

### Why shift in storage, not a logical index translation layer?

An alternative (Approach B) would maintain a list of deleted indices and translate between logical/physical indices on every access. Rejected because:

- Complicates every operation: `getItem`, `getItemsInRange`, `loadRange`, `ensureRange`, adapter offset calculation
- The adapter returns items at server-side offsets — translation on every load response adds significant complexity
- The performance cost of shifting cached chunks on deletion is negligible (O(cachedItems), typically 50–2000)
- The common case is deleting a small number of items, not bulk deletion of thousands

### Why `forceRender` instead of fixing `renderIfNeeded`?

`renderIfNeeded` correctly optimizes the hot path (scroll-triggered re-renders) by comparing range bounds. Making it also compare item identity would add overhead to every scroll frame. Since `removeItem` is a rare, explicit mutation, a targeted `forceRender` call is the right trade-off.

### Why debounce `ensureRange` but not `forceRender`?

`forceRender` is synchronous DOM work — each call ensures the DOM reflects the current storage state. Debouncing it could break code that reads the DOM between deletions. `ensureRange` is an async network request — firing multiple overlapping requests is wasteful and the last one always wins anyway.

---

## Edge Cases Handled

1. **Deleting while a load is in flight** — `activeLoads.clear()` in `removeItem` invalidates stale range keys. Orphaned in-flight responses may write stale data, but the debounced `ensureRange` fires afterward with correct offsets and overwrites.
2. **Deleting multiple items** — the track-list example processes from highest index to lowest to avoid double-shifting. The debounced `ensureRange` fires once after all deletions.
3. **Deleting an item not in the viewport** — works correctly since we shift storage, not DOM.
4. **Chunk-boundary gaps** — the debounced `ensureRange` detects gaps via `isRangeLoaded` and fetches missing items.
5. **Eviction** — evicted (unloaded) ranges after the deleted index are conceptually shifted too, but since they're empty slots, only `totalItems` matters.

---

## Test Coverage

All 2801 existing tests pass, including:

### SparseStorage `delete` tests (`test/features/async/sparse.test.ts`)

- ✅ Delete existing item
- ✅ Delete returns false for negative, out-of-bounds, unloaded, empty slot
- ✅ Shift items after deleted index down by 1
- ✅ Shift when deleting from the middle
- ✅ No shift when deleting the last item
- ✅ Shift across chunk boundaries (chunkSize=3)
- ✅ Handle holes during shift (gaps preserved, shifted down)
- ✅ Multiple sequential deletions
- ✅ Decrement total with unloaded items after deleted index

### DataManager `removeItem` tests (`test/features/async/manager.test.ts`)

- ✅ Remove by ID, total decreased, item no longer accessible
- ✅ Items after deleted one accessible at index - 1
- ✅ `idToIndex` correct for all remaining items
- ✅ Returns false for non-existent ID

### Integration tests (`test/integration/features.test.ts`)

- ✅ `removeItem` with selection cleanup
- ✅ Scrollbar content size updates on item removal

### Performance (`test/integration/performance.test.ts`)

- ✅ `removeItem` in under 5ms for 10K list

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/async/sparse.ts` | Rewrote `deleteItem` shift: O(cachedItems) instead of O(totalItems) |
| `src/features/async/manager.ts` | Cleaned up `removeItem`, removed debug logs |
| `src/builder/api.ts` | Added `forceRender()` + debounced `ensureRange()` after removal |
| `src/features/selection/feature.ts` | Cleaned up `rebuildIdIndex`, removed debug logs |

## Related

- `src/features/async/sparse.ts` — `SparseStorage`, chunk-based item storage
- `src/features/async/manager.ts` — `DataManager`, wraps storage + adapter + placeholders
- `src/features/async/feature.ts` — `withAsync`, wires manager into builder
- `src/builder/data.ts` — `SimpleDataManager`, reference implementation with working `splice`
- `src/builder/api.ts` — public `removeItem` API wiring
- `examples/track-list` — reproduction case with SQLite-backed CRUD