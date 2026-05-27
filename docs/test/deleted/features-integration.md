---
v1_file: test/integration/features.test.ts
v2_equivalent: null
v1_tests: 109
action: adapt
adapt_target: test/integration/features.test.ts
tags: [integration, cross-feature, horizontal, groups, grid, async, selection, scrollbar, snapshots, scale, reverse, destroy, data-ops, a11y, events]
---

# Cross-Feature Integration (v1)

## What v1 Tested

- **Double-Click Events** (5 tests): item:dblclick on rendered item, correct index for non-zero items, no emit when clicking outside items, both item:click and item:dblclick fire independently, original MouseEvent passed in payload
- **Horizontal Mode** (5 tests): correct orientation class, render items, horizontal + scrollbar, horizontal + selection, horizontal + snapshots
- **Wrap Mode scrollToIndex** (7 tests): wrap negative index, wrap past total, wrap index 0, wrap at exact total boundary, wrap large negative, wrap with smooth scrolling, no wrap when disabled (default)
- **Feature Method Collision** (2 tests): throw when two features register same method, no throw for different methods
- **Feature Conflict Detection** (2 tests): throw when conflicting features combined, throw when grid + reverse mode
- **Group Header Click Skip** (3 tests): no item:click on group header click, item:click for regular items in grouped list, no item:dblclick on group header
- **Scrollbar Content Size Updates** (3 tests): update scrollbar on items added, update on items removed, update with compression when total changes
- **Scroll Config Wheel Disabled** (2 tests): overflow hidden when wheel disabled, overflowX hidden for horizontal
- **Scroll Idle Detection** (3 tests): scrolling class during scroll, remove scrolling class after idle timeout, reset idle timer on subsequent scrolls
- **Cross-Feature Destroy Ordering** (6 tests): selection + scrollbar + snapshots, grid + selection + scrollbar, groups + scrollbar + selection, scale + scrollbar + snapshots, no throw on double destroy, async + selection + scrollbar
- **Async + Snapshots** (2 tests): capture snapshot after async load, restore snapshot after reload
- **Async + Selection** (4 tests): select after async load, maintain selection after reload, reset scroll to 0 on reload, emit selection:change with async items
- **Scroll Gutter** (4 tests): no gutter class by default, gutter-stable class, no class for auto gutter, works alongside other scroll config
- **Grid + Selection** (4 tests): select items in grid, selected class applied, selectAll in grid, clearSelection in grid
- **Reverse + Selection** (2 tests): selection in reverse mode, selection + snapshots in reverse
- **Reverse + Snapshots** (2 tests): capture in reverse, restore in reverse
- **Scale + Selection** (2 tests): select in compressed mode, selectAll compressed
- **Scale + Scrollbar + Snapshots** (2 tests): all three combined, capture and restore with compression
- **Event Subscription Edge Cases** (3 tests): multiple scroll listeners, multiple range:change listeners, no events after destroy
- **Groups + Grid Combined** (4 tests): combine groups with grid, full-width headers in grid, groups + grid + selection, destroy groups + grid
- **Groups Sticky Header Scroll** (2 tests): sticky header updates during scroll, scrollToIndex in grouped list
- **Data Operations with Features** (5 tests): setItems with selection + scrollbar, appendItems with scrollbar, prependItems with snapshots, removeItem with selection cleanup, updateItem with selection preserved
- **Reverse Mode Data Operations** (2 tests): appendItems in reverse with scrollbar, prependItems in reverse with snapshots
- **Custom Class Prefix** (2 tests): custom prefix on all feature DOM elements, custom prefix on grid layout
- **Async + Grid** (2 tests): grid layout with async data, reload maintains grid layout
- **Velocity Events with Compression** (2 tests): velocity:change during scroll, velocity 0 on idle
- **ARIA with Features** (4 tests): ARIA role on items container with selection, ARIA live region, multiple selection mode, aria-selected on items
- **Scroll Config Scrollbar None** (1 test): hide native scrollbar
- **Grid with Variable Height** (2 tests): grid + height function, grid + height function + gap
- **Concurrent Operations** (3 tests): rapid setItems, rapid scroll + data changes, selection during scroll
- **Async + Table** (6 tests): render visible rows after async load, content height matches total, correct range after reload, range:change with count, async + table + selection, aria-activedescendant points to table row
- **Baseline A11y Click vs Keyboard Scroll** (3 tests): no scroll on click of visible item, scroll on keyboard past viewport, no scroll on click after keyboard nav
- **focusOnClick** (8 tests): baseline no focus ring on click (default), focus ring when focusOnClick=true, ring moves on subsequent click, withSelection no ring default, withSelection ring when focusOnClick=true, withSelection ring moves, shift+click with focusOnClick, shift+click without focusOnClick

## Relevance to v2

- **Double-Click Events** — STILL RELEVANT. item:dblclick is a public API event.
- **Horizontal Mode** — STILL RELEVANT. Cross-feature horizontal mode combinations.
- **Wrap Mode scrollToIndex** — STILL RELEVANT if v2 supports wrap mode.
- **Feature Method/Conflict** — STILL RELEVANT. Plugin method collision and conflict detection.
- **Group Header Click Skip** — STILL RELEVANT. Group headers must not fire item:click.
- **Scrollbar Content Size** — STILL RELEVANT. Scrollbar must update when data changes.
- **Cross-Feature Destroy** — STILL RELEVANT. Every feature combination must destroy cleanly.
- **Async + Snapshots/Selection** — STILL RELEVANT. Core cross-feature scenarios.
- **Data Operations with Features** — STILL RELEVANT. CRUD operations must work with all feature combinations.
- **focusOnClick** — STILL RELEVANT. Focus ring behavior on click vs keyboard is an a11y feature.
- **Async + Table** — STILL RELEVANT. Table plugin with async loading.
- **Groups + Grid** — STILL RELEVANT. Headers spanning full grid width.

## Adaptation Notes

- This is the largest deleted test file (109 tests). Split into thematic groups when adapting:
  - Some tests map to existing v2 integration files (`test/integration/grid-selection.test.ts`, `test/integration/async-selection.test.ts`, `test/integration/async-snapshots.test.ts`, `test/integration/scale-selection.test.ts`, `test/integration/groups-grid.test.ts`)
  - New integration file needed for: destroy ordering, data operations, horizontal mode combos, events, focusOnClick, a11y click/keyboard
- Replace `vlist<T>({...}).use(...).build()` with `createVList(config)` and v2 plugin registration.
- All feature imports change: `withSelection`, `withScrollbar`, `withAsync`, `withScale`, `withSnapshots`, `withGrid`, `withGroups`, `withTable`, `withMasonry` to v2 equivalents.
- JSDOM setup replaced with happy-dom `setupDOM`/`teardownDOM`.
- `simulateScroll` helper needs v2 adaptation.
- Async tests use `waitForAsync(ms)` (simple setTimeout promise) — same pattern works in v2.
- The focusOnClick tests need the `:focus-visible` mock pattern (overriding `root.matches`).
- Cross-feature destroy tests are high-value: they verify that destroying a list with many plugins doesn't throw and cleans up properly. Test every plugin combination.
