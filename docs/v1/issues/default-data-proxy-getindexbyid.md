---
created: 2026-05-13
updated: 2026-05-13
status: resolved
---

# Default data proxy: missing `getIndexById` + O(1) id→index lookup

> Fixed. The default data proxy (used in non-async mode) now implements `getIndexById` backed by a `Map<id, index>` for O(1) lookups — critical for lists with 1M+ items.

**Status:** ✅ Resolved  
**Affects:** `src/builder/materialize.ts`

---

## Original Problem

The public API exposes `getIndexById(id)` (in `api.ts`), which delegates to `ctx.dataManager.getIndexById?.(id)`. However, the default data proxy created by `createDefaultDataProxy` in `materialize.ts` did not implement `getIndexById`.

The call chain fell through to `SimpleDataManager` (in `data.ts`), which maintains its own separate `items` array — not `$.it` (the actual items array used by the default proxy). Since `SimpleDataManager.items` is never populated in default mode, `getIndexById` always returned `-1`.

### Impact

Any consumer calling `list.getIndexById(id)` in non-async mode got `-1` regardless of whether the item existed. This forced workarounds like maintaining a parallel data array and using `Array.findIndex` to locate items before calling `updateItem`.

---

## Fix

### 1. Added `Map<id, index>` index to the default data proxy

A `Map<string | number, number>` (`idIndex`) provides O(1) lookups instead of O(n) linear scans. For a 1M-item list, this is the difference between ~500K comparisons on average and a single hash lookup.

```ts
const idIndex = new Map<string | number, number>();

const rebuildIndex = () => {
  idIndex.clear();
  for (let i = 0; i < $.it.length; i++) {
    const id = ($.it[i] as any)?.id;
    if (id !== undefined) idIndex.set(id, i);
  }
};

rebuildIndex(); // index initial items ($.it is populated before proxy creation)
```

### 2. `getIndexById` — O(1) Map lookup

```ts
getIndexById: (id: string | number): number => {
  return idIndex.get(id) ?? -1;
},
```

### 3. Index kept in sync across all mutations

| Method | Sync strategy |
|--------|---------------|
| `setItems` (offset = 0, full replace) | `rebuildIndex()` — full rebuild |
| `setItems` (offset > 0, partial) | Delete old ids at replaced positions, insert new ids — O(newItems.length) |
| `updateItem` | If id changed: delete old, insert new — O(1) |
| `removeItem` | `rebuildIndex()` after splice — indices shift |
| `clear` / `reset` | `idIndex.clear()` |

### 4. `removeItem` also uses the Map

`removeItem(id)` previously used `$.it.findIndex()` (O(n)) to resolve a string id to an index. It now uses `idIndex.get(id)` (O(1)) for both string and numeric ids, with a fallback to treating a numeric argument as a direct index for backward compatibility:

```ts
removeItem: (id: string | number) => {
  const index = typeof id === "number" ? (idIndex.get(id) ?? id) : (idIndex.get(id) ?? -1);
  if (index < 0 || index >= $.it.length) return false;
  $.it.splice(index, 1);
  rebuildIndex();
  // ...
},
```

For numeric ids, the Map is checked first. If an item with that id exists, it is resolved correctly regardless of its position. If no item matches, the number is treated as a direct array index (legacy behavior).

---

## Design Decisions

### Why `rebuildIndex()` on `removeItem` instead of incremental update?

After `splice(index, 1)`, every item after the removed index shifts down by 1. Updating the Map incrementally requires iterating all entries with `idx > removedIndex` — O(n) in the worst case, same as `rebuildIndex()`. A full rebuild is simpler and equally fast (single pass through `$.it`).

### Why incremental update on partial `setItems` instead of rebuild?

Partial `setItems(items, offset)` is used for lazy loading / pagination, where `$.it` may contain 1M+ items but only a small batch is being inserted. Rebuilding the entire index would be O(totalItems); the incremental approach is O(batchSize).

### Why delete old ids on partial `setItems`?

Without clearing old ids at replaced positions, stale entries remain in the Map. Example: if index 5 had id `"A"` and is replaced with id `"B"`, both `"A" → 5` and `"B" → 5` would exist. `getIndexById("A")` would return 5, pointing to the wrong item.

### Memory overhead

One Map entry per item: ~80–120 bytes per entry (key + value + Map overhead). For 1M items: ~100 MB. Acceptable given that the items array itself is already in memory.

---

## Files Changed

| File | Change |
|------|--------|
| `src/builder/materialize.ts` | Added `idIndex` Map, `rebuildIndex()`, `getIndexById` to default data proxy; synced across `setItems`, `updateItem`, `removeItem`, `clear`, `reset` |
