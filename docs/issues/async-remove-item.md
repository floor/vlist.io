# Async: `removeItem` leaves holes in sparse storage

> Deleting an item via `removeItem(id)` in async mode (with `withAsync`) does not actually remove the item from the visible list. Instead, it creates a gap in the sparse storage that renders as a placeholder, and the last item in the list silently disappears.

**Status:** Open  
**Affects:** `src/features/async/manager.ts`, `src/features/async/sparse.ts`  
**Example:** `examples/track-list` → select a track → Delete Selected

---

## The Problem

When using `withAsync` (adapter-backed sparse storage), calling `list.removeItem(trackId)` produces broken visual results:

1. The deleted item's slot shows a **placeholder** (masked text like `xxxxxxxxx`)
2. The list total decreases by 1, but items don't shift — so the **last item disappears**
3. The `idToIndex` map becomes stale for all items after the deleted one
4. Subsequent operations (selection, update) on shifted items may target wrong indices

### Visual symptom

Before deletion: `[A, B, C, D, E]` (total=5)  
After deleting B: `[A, placeholder, C, D]` (total=4) — B's slot is now a hole, E is gone

### Expected behavior

After deleting B: `[A, C, D, E]` (total=4) — items shift down, no placeholders

## Root Cause

The async `DataManager.removeItem()` in `manager.ts` (L459–478):

```js
const removeItem = (id) => {
  const index = idToIndex.get(id);
  storage.delete(index);        // ← sets slot to undefined (creates hole)
  removeFromIdIndex(id);
  storage.setTotal(total - 1);  // ← shrinks total, cutting off last item
  notifyStateChange();
};
```

The comment in the source says it all:

> *"In a true sparse array, items don't shift, but the total decreases."*

This is the fundamental bug. `storage.delete(index)` only sets the slot at `index` to `undefined` — it does **not** shift subsequent items down. But the total is decremented, so:

- Index `index` is now a hole → `getItem(index)` returns `undefined` → placeholder generated
- The last item (at old index `total-1`) is now at index `total` (beyond new total) → dropped

### Why the SimpleDataManager works fine

The non-async `SimpleDataManager` in `builder/data.ts` uses `items.splice(index, 1)` which **actually shifts** all subsequent array elements. The sparse storage can't do this natively because items are distributed across independent chunks.

### Cascade of stale state

After deletion without shifting:

1. **`idToIndex` map is stale** — items after the deleted one are still mapped to their old indices, but conceptually should have shifted down by 1
2. **Loaded range tracking is wrong** — chunks report ranges as loaded even though there's now a hole
3. **Subsequent adapter loads may overwrite** — if the scroll triggers a load for the range containing the hole, the adapter returns data at the original server-side offsets which no longer align with the sparse storage indices

## Solution: Shift items in sparse storage (Approach A)

### Design

Fix `deleteItem` in `SparseStorage` to **shift items down** after removing the target slot. The current behavior (punch a hole, don't shift) has no other callers — `deleteItem` is only used by `DataManager.removeItem()`, and leaving a hole is never the desired outcome. No new method needed; just fix the existing one.

`SparseStorage.deleteItem(index)`:

1. Remove the item at `index`
2. Shift all loaded items at indices > `index` down by 1
3. Decrease `totalItems` by 1

`DataManager.removeItem(id)`:

1. Call `storage.deleteItem(index)` (now shifts correctly)
2. Rebuild the `idToIndex` map (all indices after the deleted one changed)
3. Invalidate cached chunk load states for affected ranges

### Implementation in SparseStorage

Fix `deleteItem` to shift across chunk boundaries. Algorithm:

```
For each index from (deletedIndex) to (totalItems - 2):
  item = storage.get(index + 1)
  if item exists:
    storage.set(index, item)
  else:
    clear slot at index (was shifted into from a hole)
totalItems--
```

**Optimization:** Only iterate through chunks that actually have loaded data above the deleted index. Skip entirely empty chunks. For most real-world deletion patterns (deleting a few visible items), this touches at most 2–3 chunks.

### Implementation in DataManager

```js
const removeItem = (id) => {
  const index = idToIndex.get(id);
  if (index === undefined) return false;

  storage.delete(index);       // now shifts items down internally
  rebuildIdIndex();            // indices changed, rebuild from scratch
  notifyStateChange();         // triggers sizeCache rebuild + re-render
  return true;
};
```

### Why not a logical index translation layer? (Approach B — rejected)

An alternative would be to maintain a list of deleted indices and translate between logical and physical indices on every access. This was considered and rejected because:

- It complicates every operation: `getItem`, `getItemsInRange`, `loadRange`, `ensureRange`, adapter offset calculation
- The adapter returns items at server-side offsets — translating between logical/physical for every load response adds significant complexity
- The performance cost of shifting a few chunks on deletion is negligible compared to the ongoing cost of index translation on every scroll frame
- The common case is deleting a small number of items, not bulk deletion of thousands

### Edge cases to handle

1. **Deleting while a load is in flight** — the in-flight response will arrive with offsets that are now wrong. Need to either cancel the load or adjust offsets on arrival
2. **Deleting multiple items** — each successive deletion shifts indices; batch deletion from the consumer side should process from highest index to lowest to avoid double-shifting
3. **Deleting an item that's not in the viewport** — should still work correctly since we shift the storage, not the DOM
4. **`activeLoads` map** — range keys in the deduplication map become stale after a shift; clear them on removal
5. **Eviction** — evicted (unloaded) ranges after the deleted index are conceptually shifted too, but since they're empty slots, only `totalItems` matters

### Rendering

The feature-level `onStateChange` callback already calls `sizeCache.rebuild()`, `updateContentSize()`, and `renderIfNeeded()`. Once the storage is correct (items shifted, total decremented), the rendering pipeline will:

1. Recompute content height (1 item shorter)
2. Re-query `getItemsInRange()` for the visible range → gets correct shifted items
3. Re-render the visible DOM nodes with the correct data

No changes needed in the rendering pipeline.

## Test Plan

### Unit tests (SparseStorage)

- `deleteItem` middle → items after it shift down, total decreases
- `deleteItem` first → all items shift down
- `deleteItem` last → no shift needed, just total decreases
- `deleteItem` across chunk boundary → items shift correctly between chunks
- `deleteItem` when chunks after deleted index are empty → total decreases, no crash
- Multiple sequential `deleteItem` calls → each shifts correctly

### Unit tests (DataManager)

- `removeItem(id)` → item removed, total decreased, `getItemById` returns undefined
- `removeItem(id)` → items after deleted one are accessible at `index - 1`
- `removeItem(id)` → `idToIndex` is correct for all remaining items
- `removeItem(nonExistentId)` → returns false, no side effects
- Remove + `getItemsInRange` → no placeholders in previously-loaded range

### Integration tests (withAsync feature)

- Delete visible item → list re-renders without placeholders
- Delete item → total count updates in UI
- Delete item → subsequent selection works on correct items
- Delete multiple items → all removed correctly
- Delete item then scroll → no stale data or crashes

## Related

- `src/features/async/sparse.ts` — `SparseStorage`, chunk-based item storage
- `src/features/async/manager.ts` — `DataManager`, wraps storage + adapter + placeholders
- `src/features/async/feature.ts` — `withAsync`, wires manager into builder
- `src/builder/data.ts` — `SimpleDataManager`, reference implementation with working `splice`
- `src/builder/api.ts` — public `removeItem` API wiring
- `examples/track-list` — reproduction case with SQLite-backed CRUD