---
v1_file: test/features/groups/async-integration.test.ts
v2_equivalent: null
v1_tests: 24
action: adapt
adapt_target: test/plugins/groups/async-integration.test.ts
tags: [groups, async, bridge, sticky-header, index-mapping, template-dispatch, destroy, selection, striped, reload]
---

# Groups + Async Integration (v1)

## What v1 Tested

- **Build** (2 tests): builds without errors, adds grouped CSS class
- **Async Bridge Wiring** (2 tests): registers _getGroupBridge method, discovers groups as data loads
- **Feature Order Independence** (2 tests): works with withGroups before withAsync, works with withAsync before withGroups
- **Sticky Header** (2 tests): creates sticky header element in async mode, updates sticky header content after async data loads
- **Destroy** (2 tests): clean up without errors, removes grouped CSS class on destroy
- **removeItem with Async Groups** (1 test): reduces total and keeps list functional after removeItem
- **Lazy Sticky Header Creation** (1 test): no sticky headers before data loads, exactly one after
- **Select Syncs focusedIndex** (1 test): getSelected includes selected id after select() on async+groups list
- **Wrapped Data Manager** (2 tests): getItem returns header pseudo-item at header layout index, getIndexById maps data index to layout index
- **Scroll Drift Correction** (1 test): adjusts scroll when new headers are discovered while scrolled
- **Async Path Method Overrides** (3 tests): dispatches header vs data template correctly, registers _isGroupHeader for async path, handles sticky:false correctly in async mode
- **Async Striped Mode** (2 tests): builds with striped:"data" in async+groups, builds with striped:"odd" in async+groups
- **Header Template Returning HTMLElement** (1 test): renders HTMLElement header in sticky header slot
- **Reload Resets Bridge** (1 test): rebuilds groups correctly after reload
- **virtualTotalFn Fallback** (1 test): falls back to async data manager total when bridge has 0 entries

## Relevance to v2

- **Build / Feature Ordering** — STILL RELEVANT. Groups + async must work regardless of registration order. This tests the plugin system's ordering independence.
- **Async Bridge** — STILL RELEVANT. The async bridge is the mechanism that allows groups to discover group boundaries from async-loaded data. The bridge must wire up correctly and discover groups progressively.
- **Sticky Header in Async Mode** — STILL RELEVANT. Sticky headers must be lazily created (not before data loads) and update content as data arrives. This is a tricky timing issue.
- **Destroy** — STILL RELEVANT. Clean destroy with both plugins active, CSS class removal.
- **removeItem** — STILL RELEVANT. Removing an item in a grouped async list must update totals and keep the group structure consistent.
- **Wrapped Data Manager** — STILL RELEVANT. Groups wraps the async data manager to insert header pseudo-items. getItem at a header index must return the header pseudo-item, and getIndexById must map from data index to layout index (which includes headers).
- **Scroll Drift Correction** — STILL RELEVANT. When new group headers are discovered during scroll (async data loads revealing new group boundaries), the scroll position must be corrected to prevent visual jumps. This is subtle and high-value.
- **Template Dispatch** — STILL RELEVANT. The groups plugin must dispatch header templates for header indices and data templates for data indices. The _isGroupHeader method allows other features to check if an index is a header.
- **Striped Mode** — STILL RELEVANT if v2 supports striped rows in grouped lists. "data" mode stripes only data rows (not headers), "odd" mode stripes all rows.
- **Header HTMLElement Template** — STILL RELEVANT. Headers should support both string and HTMLElement return values from the template function.
- **Reload Resets Bridge** — STILL RELEVANT. After reload(), the group bridge must be rebuilt from scratch.
- **virtualTotalFn Fallback** — STILL RELEVANT. When the bridge has no entries yet (before first data load), the virtual total should fall back to the async data manager's total.

## Adaptation Notes

- Replace `vlist<T>({...}).use(withGroups({...})).use(withAsync({adapter})).build()` with v2's plugin API.
- The `TrackItem` interface has `{ id, title, day }` where `day` is the group key. The adapter creates tracks grouped by day.
- The `withGroups` config uses `getGroupForIndex(index)` in v1. v2 may use a different grouping API (e.g., `groupBy` function on the item).
- The async bridge is internal to the groups plugin. Tests access it via `(instance as any)._getGroupBridge()`. In v2, this internal API may be exposed differently.
- Sticky header assertions check for `.vlist-group-sticky` or similar class. v2 class names may differ.
- The wrapped data manager tests access `instance.getItem(headerIndex)` which returns a pseudo-item like `{ __groupHeader: true, group: "Monday" }`. v2's header pseudo-item shape may differ.
- `getIndexById` maps from data ID to layout index. In a grouped list with headers, layout index = data index + number of headers before it. This mapping is critical for scrollToIndex and selection.
- JSDOM setup replaced with happy-dom.
- The adapter uses `createTrackItems(total)` which creates items with day-based grouping. Adapt to v2's test item factory.
- Feature order tests (groups before async, async before groups) verify that `setup()` priority ordering handles dependencies correctly regardless of `.use()` call order.
