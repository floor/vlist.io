---
created: 2026-05-13
updated: 2026-05-13
status: resolved
---

# Selection returns group headers instead of real items when groups are active

> Fixed in two passes. First pass (`02716db`): removed the selection
> feature's private `idToIndexMap` — all ID-to-index lookups now delegate to
> `ctx.dataManager.getIndexById()` which handles the data-to-layout
> conversion correctly. Second pass: fixed the same class of bug in
> `selectItemRange`, `selectAll`, and Ctrl+A — these iterated
> `getAllLoadedItems()` which includes group header pseudo-items, leaking
> header IDs into the selected set.

**Status:** Resolved  
**Commits:** `02716db` (ID resolution), follow-up (range selection + selectAll)  
**Affects:** `src/features/selection/feature.ts`  
**Features involved:** `withSelection` + `withGroups` + `withAsync`

---

## The Problem

When `withGroups` is active, `selection:change` events emit group header
pseudo-items instead of real data items. This causes downstream consumers
(forms, players, detail panels) to receive objects like
`{ id: "__group_header_0", __groupHeader: true }` instead of the actual
selected item.

### Symptoms

1. **Snapshot restore:** After reload, the list highlights the correct item
   visually, but `selection:change` fires with the group header — the form
   and player stay empty.

2. **Keyboard navigation:** Pressing arrow-down alternates between the real
   item and a group header on every other keypress. The form flickers between
   the correct track and an empty/broken state.

3. **`getSelectedItems()`:** Returns group headers instead of the items the
   user actually selected.

### Console output showing the bug

```
[selection:change] selected: ['69dfae99a54606a11b794270']
                   items: [{ id: '__group_header_0' }]
```

The `selected` array has the correct track ID, but `items` resolved to the
group header at that index position.

---

## Root Cause: Two Index Spaces

When `withGroups` is active, there are two index spaces:

| Space | Description | Example (2 groups, 5 items) |
|-------|-------------|-----------------------------|
| **Data** | Raw item indices (no headers) | `[0, 1, 2, 3, 4]` |
| **Layout** | Includes group headers | `[H0, 0, 1, 2, H1, 3, 4]` → indices `[0, 1, 2, 3, 4, 5, 6]` |

The `withGroups` feature (priority 10) wraps `ctx.dataManager` before
`withSelection` (priority 50) initializes:

- `ctx.dataManager.getItem(index)` now expects a **layout index**
- `ctx.dataManager.getTotal()` returns the **layout total** (data + headers)
- `ctx.dataManager.getIndexById(id)` returns a **layout index**

### The selection feature's `idToIndexMap`

The selection feature maintained its own `Map<id, index>` for O(1) lookups,
populated via two paths:

**Path 1 — `load:end` handler (incremental):**

```ts
emitter.on("load:end", ({ items, offset }) => {
  for (let i = 0; i < items.length; i++) {
    idToIndexMap.set(items[i].id, offset + i);  // ← data-space index
  }
});
```

The `load:end` event provides `offset` in **data space** (e.g., page 2 at
offset 25). But `getItem()` on the wrapped manager expects **layout space**.
So `idToIndexMap` stored data index `0`, but `getItem(0)` returned the group
header at layout position 0 instead of the first data item at layout
position 1.

**Path 2 — `rebuildIdIndex()` (full scan):**

```ts
const storage = ctx.dataManager.getStorage();
const ranges = storage.getLoadedRanges();  // ← data-space ranges
for (const range of ranges) {
  for (let i = range.start; i <= range.end; i++) {
    const item = ctx.dataManager.getItem(i);  // ← expects layout index
    idToIndexMap.set(item.id, i);              // ← stores data index
  }
}
```

`getLoadedRanges()` returns ranges from the underlying async storage in
**data space**, but `getItem(i)` interprets `i` as a **layout index**.
Same mismatch.

### The mismatch in `forceRenderAndEmit`

```ts
const getItemByIdFn = (id) => {
  const index = idToIndexMap.get(id);   // ← data-space index
  return ctx.dataManager.getItem(index); // ← expects layout-space index
};
```

For track `69dfae99...` at data index 0:
- `idToIndexMap.get('69dfae99...')` → `0` (data index)
- `ctx.dataManager.getItem(0)` → group header at layout position 0
- Result: `selection:change` emits `{ items: [__group_header_0] }`

### Why it alternated on keyboard nav

`moveFocusAndSelect()` correctly operates in layout space — it calls
`skipHeaders()` to land on real items and `selectOne(item.id)` with the
correct ID. But `forceRenderAndEmit()` then resolved that ID through the
broken `idToIndexMap`, returning a group header.

The alternating pattern occurred because `_selectedId` was set to
`__group_header_0` on one keypress (from the broken resolution), then on
the next keypress the real item had a different ID so it passed the
`newId !== _selectedId` guard and emitted correctly — until the cycle
repeated.

---

## Fix 1: ID-to-Index Resolution (`02716db`)

Removed the `idToIndexMap`, `rebuildIdIndex()`, and the `load:end` indexer
entirely. All ID-to-index resolution now delegates to the data manager,
which already handles the conversion correctly when wrapped by `withGroups`.

### Shared helpers

```ts
const getIndexById = (id: string | number): number => {
  return ctx.dataManager.getIndexById(id);
};

const getItemById = (id: string | number): T | undefined => {
  const index = getIndexById(id);
  if (index < 0) return undefined;
  return ctx.dataManager.getItem(index);
};
```

`getIndexById` is a required method on `SimpleDataManager` — both the
simple and async data managers implement it. No fallback needed.

### Why this is correct

- **`withAsync` data manager:** `getIndexById()` uses its own internal
  `idToIndex` map (O(1), data-space indices). Without groups, data space =
  layout space, so indices are correct.

- **`withGroups` wrapped manager:** Overrides `getIndexById()` to call the
  underlying manager's version then convert via `bridge.dataToLayoutIndex()`.
  Returns correct layout-space indices.

### What was replaced

| Before | After |
|--------|-------|
| `idToIndexMap` (Map, ~100 lines) | `getIndexById()` / `getItemById()` (~20 lines) |
| `rebuildIdIndex()` (3 code paths) | Removed — no longer needed |
| `load:end` indexer (incremental) | Removed — no longer needed |
| `data:change` → `rebuildIdIndex()` | `data:change` → just `selected.delete(id)` |
| 4 inline `getItemByIdFn` closures | Single shared `getItemById` |

---

## Fix 2: Range Selection and Select All (follow-up)

The first fix addressed ID-to-index lookups, but three other code paths
used `ctx.getAllLoadedItems()` which — when groups are active — includes
group header pseudo-items in the returned array. This leaked header IDs
(e.g. `__group_header_0`) into the `selected` set.

### The problem

`getAllLoadedItems()` calls `getItemsInRange(0, total - 1)` on the wrapped
data manager. The groups wrapper's `getItemsInRange` iterates layout indices
and returns headers alongside real items. Code that iterated this array
without filtering headers would `selected.add(headerItem.id)`.

**Affected paths:**

1. **`selectItemRange()`** — used by Shift+Click, Shift+Space, and
   Ctrl+Shift+Home/End. The range anchors always land on real items (via
   `skipHeaders`), but items *between* the anchors could include headers.

2. **Ctrl+A toggle** — compared `selected.size === allItems.length` where
   `allItems` included headers, breaking the toggle logic. Also added
   header IDs when selecting all.

3. **`selectAll()` public method** — same issue as Ctrl+A.

### Consequences

- `getSelected()` returned header IDs in the array
- `selected.size` was inflated, breaking the Ctrl+A select/deselect toggle
- Header IDs in `selected` were never cleaned up (headers don't trigger
  `data:change`)
- `getSelectedItems()` silently filtered them out (couldn't resolve the ID),
  masking the bug

### The fix

**`selectItemRange`** — changed from taking an `items: T[]` array to
reading directly from `ctx.dataManager.getItem(i)`, skipping headers:

```ts
const selectItemRange = (fromIndex: number, toIndex: number): void => {
  if (mode !== "multiple") return;
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  for (let i = start; i <= end; i++) {
    if (isHeader(i)) continue;
    const item = ctx.dataManager.getItem(i);
    if (item) selected.add(item.id);
  }
};
```

**Ctrl+A and `selectAll()`** — iterate via data manager with `isHeader`
skip instead of `getAllLoadedItems()`:

```ts
const total = ctx.dataManager.getTotal();
for (let i = 0; i < total; i++) {
  if (isHeader(i)) continue;
  const item = ctx.dataManager.getItem(i);
  if (item) selected.add(item.id);
}
```

### Performance

- **Async mode:** `ctx.dataManager.getIndexById()` is O(1) — same as the
  removed `idToIndexMap`. The `dataToLayoutIndex` conversion is O(log n) via
  binary search on group boundaries.

- **`selectItemRange`** — iterates the range directly instead of
  pre-building a full items array. Strictly less work.

- **Bundle size:** net reduction (removed `getAllLoadedItems` calls,
  removed dead linear scan fallback).

---

## Affected Call Sites

All places that resolved items by ID or iterated items were updated:

| Call site | Fix | Purpose |
|-----------|-----|---------|
| `forceRenderAndEmit()` | 1 | Resolves items for `selection:change` events |
| `getSelectedItems()` | 1 | Public API for reading selected items |
| `select(...ids)` | 1 | Public API — also sets focus on the selected item |
| `_focusById(id)` | 1 | Internal — used by `withSnapshots` and `withSortable` |
| Delete/Backspace handler | 1 | Resolves items for the `delete` event |
| `selectItemRange()` | 2 | Shift+Click, Shift+Space, Ctrl+Shift+Home/End |
| `selectAll()` | 2 | Public API for selecting all items |
| Ctrl+A handler | 2 | Keyboard shortcut for select/deselect all |

---

## Test Results

All 3401 existing tests pass. Mock data managers in selection tests were
updated to include `getIndexById` (required on `SimpleDataManager`).
Stale test names referencing `rebuildIdIndex` and `load:end` indexing
were updated to reflect the current delegation-based approach.
