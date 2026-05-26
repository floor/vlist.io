---
v1_file: test/integration/grid-masonry-nav.test.ts
v2_equivalent: null
v1_tests: 25
action: adapt
adapt_target: test/integration/grid-masonry-nav.test.ts
tags: [grid, masonry, keyboard-navigation, 2d-nav, a11y, selection, horizontal, renderer]
---

# Grid & Masonry 2D Keyboard Navigation (v1)

## What v1 Tested

- **Grid Baseline Single-Select Navigation** (6 tests): no scroll jump on click, ArrowDown moves by columns (row navigation), ArrowRight moves by 1 cell, Home goes to first item, End goes to last item, Ctrl+Home/Ctrl+End same as Home/End
- **Grid withSelection Navigation** (4 tests): ArrowDown moves by columns, ArrowLeft/Right moves by 1, click does not cause scroll jump, selection:change fires on Space/Enter
- **Grid Horizontal Orientation Navigation** (4 tests): ArrowLeft moves by columns (scroll-axis) in baseline, ArrowUp/Down moves by 1 (cross-axis) in baseline, ArrowLeft/Right moves by columns with withSelection, ArrowUp/Down moves by 1 with withSelection
- **Masonry Horizontal Orientation Navigation** (3 tests): ArrowRight navigates forward in same lane (scroll-axis), ArrowDown navigates to adjacent lane (cross-axis), ArrowUp at lane 0 does not move
- **Masonry Lane-Aware Navigation** (4 tests): ArrowDown stays in same lane, ArrowRight moves to adjacent lane, ArrowLeft at lane 0 does not move, clicking does not flash (template not re-applied on state change)
- **Masonry Renderer updateItemClasses** (1 test): applies focused class without re-rendering template
- **Grid Renderer updateItemClasses** (2 tests): applies classes through grid renderer, preserves DOM content when toggling selection

## Relevance to v2

- **Grid Baseline Navigation** — STILL RELEVANT. 2D keyboard navigation in grid layout is a core a11y requirement. ArrowDown/Up must move by column count (row navigation), ArrowLeft/Right by 1 (cell navigation). No scroll jump on click.
- **Grid withSelection** — STILL RELEVANT. Selection plugin must integrate with grid's 2D navigation. selection:change must fire on Space/Enter.
- **Grid Horizontal Orientation** — STILL RELEVANT. When grid is horizontal, the axes swap: ArrowLeft/Right become scroll-axis (move by columns), ArrowUp/Down become cross-axis (move by 1).
- **Masonry Navigation** — STILL RELEVANT. Masonry's lane-aware navigation differs from grid: ArrowDown/Up navigates within a lane (scroll-axis), ArrowLeft/Right moves between lanes (cross-axis). At lane boundaries, navigation should not wrap.
- **Renderer updateItemClasses** — STILL RELEVANT. When focus/selection state changes, the renderer must update CSS classes WITHOUT re-running the template function. This prevents DOM flashing and preserves user state (input values, scroll position within items).

## Adaptation Notes

- Replace `vlist<T>({...}).use(withGrid({columns})).build()` with v2's grid plugin API.
- Replace `withMasonry({ columns })` with v2's masonry plugin API.
- Replace `withSelection(...)` with v2's selection plugin.
- The test setup creates a JSDOM environment with helpers for:
  - `focusIn()` — dispatch FocusEvent("focusin")
  - `fireKey(key)` — dispatch KeyboardEvent("keydown", { key })
  - `clickItem(index)` — find `[data-index="N"]`, dispatch MouseEvent("click")
  - `itemEl(index)` — query `[data-index="N"]`
  - `hasClass(index, cls)` — check class on item element
  - `:focus-visible` stub via `root.matches` override
- These helpers need v2 equivalents with happy-dom.
- Grid column count affects navigation step size. Tests use `columns: 3` typically, meaning ArrowDown moves focus by 3.
- Masonry lane mapping needs the v2 masonry layout's lane assignment. v1 used `withMasonry({ columns: 3 })` and items got assigned to lanes based on shortest-lane algorithm.
- The "no flash on click" test verifies that clicking does not re-render the template. It checks by adding a sentinel DOM node inside the item and verifying it persists after state change.
- The `updateItemClasses` tests verify the renderer's ability to add/remove CSS classes without touching innerHTML. This is critical for performance and UX.
- Horizontal orientation tests swap the axis mapping. Verify v2's axis mapping matches: horizontal grid uses ArrowLeft/Right for scroll-axis movement.
