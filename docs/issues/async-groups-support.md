---
created: 2026-05-07
resolved: 2026-05-08
status: resolved
version: 1.7.5
---

# Issue: withAsync + withGroups Compatibility

> Enable grouped lists with sticky headers when items are loaded asynchronously
> via paginated APIs — the same way withGroups works with static items today.

**Status:** Resolved in v1.7.5
**Priority:** High
**Affects:** `vlist/src/features/async/`, `vlist/src/features/groups/`
**Use case:** Radiooooo admin desk — track list grouped by upload day with async pagination

---

## Problem

`withGroups` and `withAsync` could not be combined. When both features were
used together, group headers never appeared because the two features operated
at different architectural layers:

- `withGroups` transforms the items array by inserting header pseudo-items at
  group boundaries, and overrides `setItems`/`appendItems` on the builder context
- `withAsync` replaces the entire data manager with its own sparse-storage
  adapter that loads items by offset/chunk and never calls the builder-level
  `setItems`/`appendItems`

The result: `withGroups`' method overrides were never triggered, `originalItems`
stayed empty, no group boundaries were computed, and no headers were inserted.

### Root Cause

```
withGroups (priority 10)     withAsync (priority 20)
─────────────────────────    ─────────────────────────
setup():                     setup():
  originalItems = []           newDataManager = createDataManager(adapter)
  groupLayout = empty          ctx.replaceDataManager(newDataManager)
  override setItems ──┐        ↑ data manager replaced, overrides orphaned
                      │
                      └──→ never called by async's internal storage
```

The overrides that `withGroups` registered on `ctx.methods` became dead code
because `withAsync` replaced the data manager and used its own item storage.

---

## Solution

### Architecture: AsyncGroupBridge

A **virtual group layer** (`async-bridge.ts`) sits between the async data
manager and the renderer. Instead of physically inserting header pseudo-items
into the data array (impossible with sparse storage), the bridge:

- Observes items as they load via `onItemsLoaded` callbacks
- Discovers group boundaries incrementally from loaded data
- Maps between "data indices" (what the async manager knows) and "layout
  indices" (what the renderer sees, including header slots)
- Provides header/item resolution at render time

```
Async Data Manager (sparse storage)
  ↓ items by data index
AsyncGroupBridge (virtual group layer)
  ↓ items + headers by layout index
Renderer / Size Cache / Sticky Header
```

### How It Works

#### Async detection via microtask

`withGroups` runs at priority 10, `withAsync` at priority 20. By the time
features are composed, both have run `setup()`. The groups feature uses
`queueMicrotask` to detect async mode after all synchronous setups complete:

```ts
queueMicrotask(() => {
  const registerOnItemsLoaded = ctx.methods.get("_onItemsLoaded");
  if (registerOnItemsLoaded) {
    setupAsyncPath(ctx, config, bridge, ...);
  }
});
```

This means the static path runs first (producing an empty layout with 0
items, which is harmless), then the async path overwrites it in the
microtask — before any data arrives, since `withAsync`'s autoload microtask
fires after (FIFO order).

#### Incremental group discovery

The bridge caches the group key for each loaded data index in a
`Map<number, string>`. On each `onItemsLoaded`, it rebuilds group
boundaries by scanning from index 0 to `dataTotal - 1`:

- Loaded items use their cached group key
- Unloaded items (gaps) close any open group — no header is inserted at
  load/unload boundaries
- When gaps fill in later, boundaries are recomputed and cross-page
  groups merge correctly

```
Page 1 loads (0-24):   groups = [May 7, May 6, May 5]
Page 2 loads (25-49):  groups = [May 7, May 6, May 5, May 4, May 3]
                                                      ↑ new groups
Gap fills (12-24):     cross-page boundary detected, groups merge
```

#### Wrapped data manager

The async path wraps `ctx.dataManager` with a layout-space adapter:

| Method | Behavior |
|---|---|
| `getItem(layoutIndex)` | Returns header pseudo-item at header indices, delegates to async manager for data indices |
| `getIndexById(id)` | Maps data index → layout index via `bridge.dataToLayoutIndex` |
| `getItemsInRange(start, end)` | Iterates layout range, returns mixed headers + data items |
| `isItemLoaded(layoutIndex)` | Returns `true` for headers, delegates for data items |
| `removeItem(id)` | Calls `bridge.removeAt(dataIndex)` to shift group keys, then delegates |
| `reload()` | Calls `bridge.reset()` before delegating to clear all group state |

#### Size cache — mutate, don't replace

A critical fix: the `onItemsLoaded` handler calls `ctx.rebuildSizeCache()`
(mutates the existing SizeCache in place) rather than `ctx.setSizeConfig()`
(which creates a new SizeCache instance). The sticky header captures
`ctx.sizeCache` by reference at creation time — replacing the instance
makes the sticky header read stale prefix sums.

#### Sticky header

The async path creates its own sticky header with a `GroupLayout`-compatible
adapter that delegates to the bridge:

```ts
const bridgeAsLayout: GroupLayout = {
  get groups() { return bridge.groups; },
  getHeaderHeight: (i) => bridge.getHeaderHeight(i),
  // ... other delegations
};

asyncStickyHeader = createStickyHeader(dom.root, bridgeAsLayout, ctx.sizeCache, ...);
```

On each `onItemsLoaded`, the sticky header is refreshed (`cacheGroups()` →
re-reads offsets from sizeCache) and updated for the current scroll position.

#### Scroll drift correction

When new group headers are discovered while the user is scrolled, items
shift down. The `onItemsLoaded` handler captures the data index at the
current scroll position before rebuilding, then recalculates the correct
scroll position after:

```ts
// Before rebuild
const layoutIndex = ctx.sizeCache.indexAtOffset(scrollBefore);
const dataIndexAtScroll = bridge.layoutToDataIndex(layoutIndex);
const fractionInItem = (scrollBefore - baseOffset) / itemSize;

bridge.onItemsLoaded(items, offset, total);
ctx.rebuildSizeCache(bridge.totalEntries);

// After rebuild — correct for new headers
const newLayoutIndex = bridge.dataToLayoutIndex(dataIndexAtScroll);
const newScroll = ctx.sizeCache.getOffset(newLayoutIndex) + fractionInItem * newItemSize;
ctx.scrollController.scrollTo(newScroll);
```

#### Lazy sticky header (static path)

For the static path, sticky header creation is deferred via
`ensureStickyHeader()` until groups actually exist (`groupCount > 0`).
This avoids creating DOM elements that would be immediately hidden in
async mode (0 groups before data loads) or replaced by the async path's
own sticky header.

### API Change

`getGroupForIndex` receives the item as a second argument:

```ts
// Before (static only):
getGroupForIndex: (index: number) => string

// After (async-compatible):
getGroupForIndex: (index: number, item?: T) => string
```

Backward-compatible — existing consumers that index an external array
continue to work. Async consumers use the `item` parameter directly.

---

## Feature Compatibility (Updated)

| Combination | Status | Notes |
|---|---|---|
| `withGroups` + static items | ✅ Works | Original design, unchanged |
| `withGroups` + `withGrid` | ✅ Works | Full-width headers, grid-aware layout |
| `withGroups` + `withTable` | ✅ Works | Full-width header rows |
| `withGroups` + `withAsync` | ✅ Works | v1.7.5 — async group bridge |
| `withGroups` + `withAsync` + `withScale` | ✅ Works | Tested in radiooooo desk |
| `withGroups` + `withAsync` + `withSelection` | ✅ Works | Headers not selectable |
| `withGroups` + `withAsync` + `withSnapshots` | ✅ Works | Scroll restore with group-aware drift correction |

---

## Files Modified

| File | Change |
|---|---|
| `src/features/groups/async-bridge.ts` | **New** — AsyncGroupBridge: virtual group layer with incremental boundary discovery, layout/data index mapping, removeAt support |
| `src/features/groups/feature.ts` | Added `setupAsyncPath()` — async detection via microtask, wrapped data manager, sticky header, scroll drift correction, stripe map, template dispatch. Lazy `ensureStickyHeader()` for static path |
| `src/features/groups/types.ts` | Updated `getGroupForIndex` signature to accept optional item parameter |
| `src/features/groups/layout.ts` | Pass item to `getGroupForIndex` callback |
| `src/features/groups/index.ts` | Re-export async bridge types |
| `src/features/async/feature.ts` | Exposed `_onItemsLoaded` hook and `_getGroupBridge` accessor for cross-feature communication |
| `src/features/selection/feature.ts` | `select()` now syncs `focusedIndex` for keyboard nav continuity |
| `src/features/snapshots/feature.ts` | Debounced auto-save with rAF; scroll drift fix for compression ratio=1 |
| `src/builder/api.ts` | Lazy `removeItem` resolution — reads from `methods` at call time so async path's deferred override takes effect |
| `src/builder/data.ts` | Added `getIndexById` to `SimpleDataManager` interface and implementation |
| `src/types.ts` | Added `scrollTop` and `offsetRatio` fields to `ScrollSnapshot` |

---

## Test Coverage

### Unit Tests (async-bridge.test.ts) — 85 tests

- [x] Incremental group discovery — single page, multi-page, all pages at once
- [x] Cross-page boundaries — same group spans pages, merge on gap fill
- [x] Non-sequential page loads — sparse loading with gaps
- [x] Index mapping — layoutToDataIndex, dataToLayoutIndex, header detection
- [x] Group lookup — getGroupAtLayoutIndex, getGroupAtDataIndex via binary search
- [x] removeAt — middle item, last-in-group, first item, key shifting, totalEntries
- [x] Reset and reload — clears state, rebuilds correctly
- [x] Edge cases — single item, all same group, each item unique group, empty

### Integration Tests (async-integration.test.ts) — 24 tests

- [x] `withAsync` + `withGroups` builds without errors (both feature orders)
- [x] Group headers appear as async pages load
- [x] Sticky header renders correct content after data loads
- [x] `removeItem` with async groups reduces total
- [x] Lazy sticky header — no duplicates before/after data loads
- [x] `select()` syncs focusedIndex for keyboard nav
- [x] Template dispatches headers vs data items correctly
- [x] Stripe map works in async+groups mode (data, even, odd)
- [x] Sticky: false — no sticky header element created
- [x] HTMLElement header template in sticky slot
- [x] Reload resets and rebuilds groups
- [x] VirtualTotalFn fallback to async manager total

### Unit Tests (feature.test.ts) — 13 async path tests

- [x] Wrapped data manager: getIndexById, getItem, getItemsInRange, isItemLoaded
- [x] Method overrides: _isGroupHeader, _layoutToDataIndex, _dataToLayoutIndex
- [x] Static removeItem override deleted in async path
- [x] Template dispatch (header pseudo-items vs data items)
- [x] Table integration (_updateTableForGroups) in async mode
- [x] Stripe map in async mode (data, odd offsets)
- [x] Scroll drift correction when new headers discovered
- [x] Sticky header DOM creation with bridgeAsLayout adapter

### Coverage

| File | Functions | Lines |
|---|---|---|
| `groups/feature.ts` | 73.08% | 97.98% |
| `groups/async-bridge.ts` | 100% | 100% |
| `groups/layout.ts` | 100% | 100% |
| `groups/sticky.ts` | 100% | 100% |

---

## Commits

| Hash | Description |
|---|---|
| `9ccc6ca` | feat(groups,async): add withAsync + withGroups compatibility |
| `99f49ab` | fix(groups): update sticky header position after async data loads |
| `8d222fb` | fix(snapshots,groups): fix scroll drift on restore with group headers |
| `7eb5981` | fix(groups,table): sticky header position |
| `a7f0fa6` | fix(groups): prevent stale sizeCache in sticky header after async data loads |
| `a97a305` | fix(groups,selection): fix removeItem and keyboard nav with async groups |
| `353d589` | test(groups,snapshots): improve coverage for async groups and fix snapshot autoSave tests |
| `a8ba3d1` | chore(release): v1.7.5 |
