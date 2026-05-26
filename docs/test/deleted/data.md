---
v1_file: test/builder/data.test.ts
v2_equivalent: null
v1_tests: 78
action: adapt
adapt_target: test/core/data.test.ts
tags: [data-manager, items, crud, callbacks, state, pure-functions]
---

# SimpleDataManager (v1)

## What v1 Tested

- **Factory / Initial State** (4 tests): default empty state (total=0, cached=0, isLoading=false, pendingRanges=[], no error, hasMore=false), create with initial items, create with items + explicit total, infer total from items.length
- **Getters: getTotal / getCached** (2 tests): return 0 for empty, correct counts after setItems
- **Getters: getIsLoading / getHasMore** (2 tests): always return false, still false after operations
- **Getters: getStorage / getPlaceholders** (1 test): both return null
- **getItem** (3 tests): valid index returns item, out-of-bounds returns undefined, empty manager returns undefined
- **isItemLoaded** (3 tests): true for loaded indices, false for out-of-bounds, false for empty manager
- **getItemsInRange** (6 tests): valid range, clamp start to 0, clamp end to total-1, empty manager returns [], full range 0 to total-1, single item (start=end)
- **setTotal** (2 tests): update total without affecting items, set total to 0
- **setItems** (9 tests): set items and infer total, set with explicit total, full replacement (offset=0 + explicit total), partial set semantics (offset=0, no explicit total, pre-populated), full replacement on empty manager, append at offset, overwrite at middle offset, update total from offset+length, explicit total for partial set
- **updateItem** (6 tests): update at valid index (merge, not replace), return false for negative index, return false for out-of-bounds, return false for empty, does not affect other items
- **removeItem** (8 tests): remove at valid index (items shift), remove first, remove last, return false for negative, return false for out-of-bounds, return false for empty, decrement total to min 0, consecutive removals
- **clear** (2 tests): remove all items and set total to 0, safe on empty
- **reset** (1 test): clear and notify state change
- **onStateChange callback** (6 tests): fires on setItems, fires on updateItem, does NOT fire on failed updateItem, fires on removeItem, does NOT fire on failed removeItem, fires on reset
- **onItemsLoaded callback** (3 tests): fires with (items, offset, total) on setItems, correct offset for partial set, explicit total propagated
- **Stub Methods** (7 tests): loadRange resolves, ensureRange resolves, loadInitial resolves, loadMore returns false, loadMore with direction returns false, reload resolves, evictDistant is no-op
- **getState** (3 tests): fresh snapshot each call, reflects state after operations, static fields always correct
- **Edge Cases** (9 tests): setItems after clear, multiple setItems calls, single item, remove until empty, updateItem after removeItem, large item count (100K), string IDs, getItemsInRange where start > end

## Relevance to v2

- **Factory / Initial State** — PARTIALLY RELEVANT. v2 may not have a `SimpleDataManager` class. If v2 uses a different data storage abstraction, these tests need to target that instead. The state shape (total, cached, isLoading, etc.) may differ.
- **Item Access (getItem, isItemLoaded, getItemsInRange)** — STILL RELEVANT if v2 has an equivalent data manager. Boundary checking, clamping, and empty-list behavior are universal.
- **setItems with offset semantics** — STILL RELEVANT. The partial-set vs full-replacement logic (based on whether offset=0 and explicit total is provided) is subtle and well-tested here. Critical for async data loading.
- **updateItem / removeItem** — STILL RELEVANT. CRUD operations with proper shift behavior, boundary guards, and callback notifications.
- **Callbacks (onStateChange, onItemsLoaded)** — STILL RELEVANT. Notification patterns are essential for reactivity. Tests verify callbacks fire on success but NOT on failed operations.
- **Stub Methods** — PARTIALLY RELEVANT. These test the no-op async interface on the sync data manager. If v2 separates sync/async managers differently, these may not apply.
- **Edge Cases** — STILL RELEVANT. String IDs, 100K items, remove-until-empty, updateItem-after-removeItem are all important edge cases.

## Adaptation Notes

- Locate v2's data manager equivalent. It may be in `src/core/data.ts` or integrated into the engine state.
- `createSimpleDataManager<T>({ initialItems, initialTotal, onStateChange, onItemsLoaded })` factory needs mapping to v2's equivalent.
- The `VListItem` type constraint (items must have `id`) should be the same in v2.
- The partial-set semantics tests (9 setItems tests) are the most critical — they catch subtle bugs in how data is replaced vs appended.
- The callback tests use `mock(() => {})` from bun:test — this is the same in v2.
- The stub methods (loadRange, ensureRange, etc.) exist so the sync manager satisfies the same interface as the async manager. If v2 uses a different approach (e.g., separate interfaces), skip these.
- `getState()` returning a fresh snapshot each call prevents stale references — important for reactivity.
- Consider placing adapted tests in `test/core/data.test.ts` to match v2's directory structure.
