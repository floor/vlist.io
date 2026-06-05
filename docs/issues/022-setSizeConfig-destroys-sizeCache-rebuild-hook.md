---
id: "022"
title: setSizeConfig destroys sizeCache.rebuild hook (breaks groups + table)
severity: high
status: resolved
component: core/create, plugins/groups, plugins/table
related: []
---

# Issue 022: setSizeConfig destroys sizeCache.rebuild hook

---

## Symptom

When the groups plugin and table plugin are used together:
- Group headers do not appear in table mode
- Keyboard navigation via `selectNext`/`selectPrevious` is a no-op (`getTotalFn()` returns 0)
- `engineState.totalItems` stays at the raw data count instead of including group header entries
- The sticky group header element is present but empty

The same groups + table combination works correctly in the `data-table` example when `autoLoad: true` is used and `selectNext` is not called externally.

## Root cause

`setSizeConfig` in `core/create.ts` uses `Object.assign(sizeCache, newCache)` to replace all sizeCache methods with a fresh cache. This overwrites `sizeCache.rebuild` unconditionally.

The groups plugin (priority 10) hooks `sizeCache.rebuild` during its setup to intercept rebuild calls and update its group layout (`layout.rebuild`, `engineState.totalItems = layout.totalEntries`). The table plugin (also priority 10, but later in the plugin array) calls `ctx.setSizeConfig(rowHeight)` during its setup, which `Object.assign`s a new cache and **destroys the groups hook**.

After this point, `sizeCache.rebuild(n)` calls the new cache's plain rebuild (no group layout update). The group layout is never rebuilt when data loads, so `layout.totalEntries` stays at 0.

### Why selectNext breaks

The selection plugin's `resolveOnce` captures `getTotalFn = () => layout.totalEntries` from the groups plugin's `getGroupLayout` method. Since `layout.totalEntries` is never updated (the rebuild hook was destroyed), `getTotalFn()` returns 0, and `selectNext` early-returns.

### Why this is hidden in existing examples

The `data-table` example uses `autoLoad: true`, so the first data load happens via a `queueMicrotask` in the data plugin's setup — by which time the groups plugin's deferred `queueMicrotask` has also run. The groups plugin's table-mode `queueMicrotask` block re-hooks `sizeCache.rebuild` after all sync setups complete, which happens to paper over the issue for the auto-load case.

However, when `autoLoad: false` is used (and data is loaded externally via `setTotal` + `loadInitial` or `reload`), the `sizeCache.rebuild` call from the data plugin's `onDataChange`/`onItemsLoaded` callback fires BEFORE the groups plugin's `queueMicrotask` re-hook, so the rebuild uses the table plugin's plain rebuild — no group layout update.

## Steps to reproduce

```javascript
const list = createVList(
  { container, item: { height: 36, template: () => '' } },
  [
    data({ adapter, autoLoad: false, storage: { chunkSize: 25 } }),
    table({ columns, rowHeight: 36, headerHeight: 36 }),
    groups({ getGroupForIndex: (i, item) => item?.category || '…', header: { height: 32, template: (key) => key } }),
    selection({ mode: 'single' }),
  ]
);

// After data loads:
list.setTotal(100);
list.loadInitial();
// At this point:
// - list.total → 100 (data total)
// - But layout.totalEntries → 0 (groups never rebuilt)
// - list.selectNext() → no-op (getTotalFn returns 0)
```

## Affected API

- `selectNext()` / `selectPrevious()` — no-op when groups + table
- `engineState.totalItems` — wrong (raw data count, not layout count with headers)
- Group headers not rendered in table mode
- Sticky header empty

## Analysis

The `sizeCache.rebuild` hook chain is:

```
groups setup (priority 10):
  origSizeCacheRebuild = sizeCache.rebuild  // captures base
  sizeCache.rebuild = groupsHook            // installs hook
                                            // groupsHook calls origSizeCacheRebuild(n)

table setup (priority 10, later in array):
  ctx.setSizeConfig(rowHeight)
    → Object.assign(sizeCache, newCache)    // OVERWRITES groupsHook with newCache.rebuild
                                            // origSizeCacheRebuild still points to OLD base

data onDataChange / onItemsLoaded:
  sizeCache.rebuild(total)                  // calls newCache.rebuild (no groups logic)
```

The groups hook and its captured `origSizeCacheRebuild` are both orphaned.

## Implemented fix

Option 2 from the original analysis doesn't work because `prevRebuild` captures the old cache's closure — calling it rebuilds the old prefix sums, not the new cache's. The new cache's `getOffset`/`getSize` read from their own closure, disconnected from the old `rebuild`.

The actual fix uses **Option 1 (indirect delegate)** via a `_setSizeCacheBase` registered method:

1. **Plugins register `_setSizeCacheBase`**: both groups and grid register a method that updates their internal delegate (`origSizeCacheRebuild` / `baseRebuild`) to point at the new cache's `rebuild`.

2. **`setSizeConfig` detects and preserves hooks**: if `_setSizeCacheBase` is registered, `setSizeConfig` saves the hook before `Object.assign`, restores it after, and calls `_setSizeCacheBase(newCache.rebuild)` to update the delegate.

```javascript
setSizeConfig(sc) {
  const newCache = createSizeCache(sc, state.totalItems);
  const setBase = methods.get("_setSizeCacheBase");
  if (setBase) {
    const hooked = sizeCache.rebuild;
    Object.assign(sizeCache, newCache);
    sizeCache.rebuild = hooked;       // restore hook
    setBase(newCache.rebuild);         // update delegate
  } else {
    Object.assign(sizeCache, newCache);
  }
}
```

This is fully synchronous — no `queueMicrotask` timing dependency. The hook survives any number of `setSizeConfig` calls regardless of `autoLoad` timing.

## Environment

- vlist v2.1.2+
- Reproducible when: groups + table + data plugins used together with `autoLoad: false`
- Not reproducible when: `autoLoad: true` (masked by microtask timing)
- **Fixed in**: staging (commit 97ae998)
