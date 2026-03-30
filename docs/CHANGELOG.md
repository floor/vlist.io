# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.8] — 2026-03-13

### Fixed

- **`updateItem` re-applies template** — `updateItem()` now forces a template re-application after updating the data manager. Previously, the scroll-driven render loops (core, grid, table) skipped re-templating when the item id hadn't changed, so in-place data changes (e.g. updated cover image, renamed field) were silently ignored in the DOM
- **`updateItem` preserves selection** — Selection and focus state are now correctly read from the `withSelection` feature's internal state instead of the stale initial refs
- **Async `updateItem` signature** — The async data manager's `updateItem` now accepts an index (matching the `SimpleDataManager` interface) instead of an id. The previous id-based signature silently failed for all async lists because the builder API always passes an index

### Changed

- **`updateItem` public API** — `updateItem(id, updates)` is now `updateItem(index, updates)`. Use `getIndexById(id)` to resolve an id to an index first. This aligns the public API with the internal data manager interface
- **Renderer `updateItem` always re-templates** — Grid and table renderer `updateItem` methods no longer skip re-templating when the item id is unchanged. The id-based skip optimization now only applies in the scroll-driven `render()` path
- **`_updateRenderedItem` internal method** — Core registers a default `_updateRenderedItem` method for list mode. Grid and table features override it with their own renderer's `updateItem`. This provides a unified path for the builder API to re-apply templates across all view modes

### Performance

- **Cached method getters** — `_updateRenderedItem`, `_getSelectedIds`, and `_getFocusedIndex` are resolved lazily on first `updateItem` call and cached, avoiding three `Map.get()` lookups per call
- Base bundle: 104.4 KB minified (34.5 KB gzipped)
- 2,852 tests / 38,035 assertions — all passing

## [1.3.7] — 2026-03-12

### Added

- **Dev-mode diagnostics** — Development-only warnings for common mistakes, compiled out in production builds (DCE-verified, 0 KB overhead):
  - `setItems()`: warn on non-array argument, missing `id` field, duplicate IDs
  - `scrollToIndex()`: warn on out-of-range index
  - `updateItem()` / `removeItem()`: warn when target item not found
  - Template: warn on falsy/empty return with item index context
  - All guards use inline `process.env.NODE_ENV` checks for dead code elimination
- **ARIA live region** — `aria-live="polite"` element announces visible range changes to screen readers
- **Focus recovery** — `removeItem()` moves focus to the nearest remaining item when the focused item is removed
- **Feature conflict declarations** — `withGrid` and `withMasonry` now declare mutual exclusivity (`conflicts` array), validated at build time
- **Tree-shaking verification** — 11 scenarios integrated into `measure-size.ts`, verified in CI
- **Coverage threshold enforcement** — `check-coverage.ts` script enforces 85% minimum, integrated into CI pipeline
- **Shared test helpers** — `test/helpers/` with reusable DOM setup (`MockResizeObserver`), factory utilities (`createTestItems`, `createContainer`), and timer helpers (`flushMicrotasks`, `flushTimers`, `flushRAF`)
- **DOM snapshot tests** — 11 structural snapshot tests across 6 configurations (base, grid, groups, masonry, table, selection)

### Fixed

- **Rendering: cancel scroll on data change** — `setItems()` now calls `cancelScroll()` before updating data, preventing stale smooth-scroll animations from fighting new content
- **Rendering: zero-height guard** — `coreRenderIfNeeded()` skips render when `containerSize <= 0`, preventing division-by-zero in range calculations

### Changed

- **CSS `:root` defaults** — Custom property defaults moved from `[data-theme-mode="light"]` to `:root`, reducing CSS by ~0.7 KB and removing the dependency on a data attribute for base styling

### Performance

- Base bundle: 100.4 KB minified (33.3 KB gzipped) — full build with all features
- Base (tree-shaken): 27.4 KB minified (10.3 KB gzipped)
- 2,822 tests / 37,978 assertions — all passing
- **V1 Code Review — all 14 items complete** ✅

---

## [1.3.6] — 2026-03-11

### Fixed

- **Async `removeItem`** — Shift sparse storage after removal, force render, and debounced gap refill to prevent stale placeholders
- **Async grid range** — Convert row-space `renderRange` to item indices when grid is active, fixing items not loading in grid+async combos
- **Async pending range** — Use live render range in `loadPendingRange` instead of stale saved coordinates
- **Types** — Widen `removeItem` signature to `string | number` across all data managers

### Added

- **Table placeholder styling** — Skeleton loading styles for table rows when used with `withAsync`

### Performance

- Base bundle: 98.3 KB minified (32.5 KB gzipped)

---

## [1.3.5] — 2026-03-09

### Fixed

- **Table padding** — Account for cross-axis padding in column width resolution
- **Async placeholder analysis** — Eagerly analyze placeholder structure on first `setItems` with adapter

### Performance

- Base bundle: 96.7 KB minified (31.9 KB gzipped)

---

## [1.3.4] — 2026-03-09

### Added

- **Dark mode** — Consolidated dark mode support with `prefers-color-scheme`, `.dark` class, and `color-scheme` property
- **Group-aware striped rows** — `item.striped` now accepts `"data"`, `"even"`, and `"odd"` in addition to `boolean`. When combined with `withGroups`, these modes control how group headers affect the even/odd stripe pattern:
  - `"data"` — headers are excluded from the count; stripe index is continuous across groups
  - `"even"` — counter resets after each header; first data row is always even (non-striped) — matches macOS Finder
  - `"odd"` — counter resets after each header; first data row is always odd (striped)

  Implemented via a precomputed `Int32Array` stripe map built by the groups feature. The per-item cost on the scroll hot path is a single array lookup. Without `withGroups`, all string modes behave like `true`. See [Groups — Striped Rows](features/groups.md#striped-rows-with-groups).

### Changed

- **Exports cleanup** — Cleaned up public export surface

### Performance

- Base bundle: 96.6 KB minified (31.8 KB gzipped)

---

## [1.3.3] — 2026-03-08

### Added

- **Item gap** — New `item.gap` property adds consistent spacing between items along the main axis. The gap is baked into the size cache (`slot = itemSize + gap`) and subtracted from the DOM element height, so items are positioned with precise spacing and no CSS hacks. Works with fixed sizes, variable sizes, and auto-measured sizes (Mode B). The trailing gap after the last item is automatically removed. Ignored when grid or masonry is active (they manage their own gap). ([`b81ac49`])
- **Content padding** — New top-level `padding` property adds inset space around the list content, following CSS shorthand convention:
  - `number` — equal padding on all four sides
  - `[vertical, horizontal]` — top/bottom and left/right
  - `[top, right, bottom, left]` — per-side (CSS order)

  Applied as CSS `padding` + `border-box` on `.vlist-content`, so it works identically for list, grid, and masonry layouts with zero positioning overhead. Grid and masonry automatically subtract cross-axis padding from the container width so columns/lanes size correctly. `scrollToIndex` accounts for padding so the last item scrolls fully into view including end padding. ([`e8ee865`])

### Changed

- **Scroll-to-position** — Moved padding-aware scroll logic into `calcScrollToPosition`

### Performance

- Base bundle: 24.7 KB minified (9.3 KB gzipped)

---

## [1.3.2] — 2026-03-08

### Fixed

- **Wheel handler event consistency** — The wheel handler now delegates to `onScrollFrame` instead of reimplementing scroll logic inline. This fixes two bugs:
  - `afterScroll` hooks were not called during wheel scrolling — features relying on post-scroll callbacks missed wheel events entirely
  - `velocity:change` events were not emitted during wheel scrolling — features listening to velocity got no updates
  - Scroll events no longer double-fire (the native `scroll` event triggered by programmatic `scrollTop` assignment is now guarded against re-entry)

### Changed

- **Builder core decomposition** — Internal refactor of `builder/core.ts` with no public API changes:
  - Extracted Mode B measurement subsystem to `builder/measurement.ts` (200 lines) — ResizeObserver, scroll correction, content size deferral, stayAtEnd
  - Extracted public API assembly to `builder/api.ts` (308 lines) — data wrappers, scroll methods, event subscription, destroy teardown
  - Deduplicated idle timeout handler (`onScrollIdle` + `scheduleIdle`), click/dblclick traversal (`findClickTarget`), and scroll-end pinning (`stayAtEnd`)
  - `core.ts` reduced from 1,513 → 1,097 lines (−28%)
  - Base bundle: 23.6 KB minified (−0.5 KB), 8.8 KB gzipped (+0.1 KB)

---

## [1.3.1] — 2026-03-07

### Fixed

- **Grid phantom row** — Remove `visibleEnd++` phantom row, use exclusive viewport boundary
- **Grid DOM cleanup** — Reduce `RELEASE_GRACE` from 2 to 1 to halve lingering DOM elements during scroll
- **Grid constants** — Import `OVERSCAN`/`CLASS_PREFIX`/`SCROLL_IDLE_TIMEOUT` from shared constants
- **Table phantom row** — Remove `visibleEnd++` phantom row, use exclusive viewport boundary
- **Table grace period** — Remove `RELEASE_GRACE` entirely — table rows carry N cells, no grace needed
- **Masonry cleanup** — Reduce `RELEASE_GRACE` from 2 to 1
- **Masonry overscan** — Extract overscan pixel multiplier into `OVERSCAN` constant

### Changed

- Remove redundant `?? 3` overscan fallbacks in grid, table, masonry features

---

## [1.3.0] — 2026-03-06

### Fixed

- **Mobile detection** — Replace UA sniffing with `pointer:coarse` capability detection
- **Table test types** — Add missing `TestItem` generic to `withTable` call in sort test

### Changed

- **CONTRIBUTING.md** — Complete rewrite to match v1.x builder/feature architecture
- **CI/CD** — Add GitHub Actions workflow (typecheck, test, build, bundle size)
- **Test coverage** — Improved to 97% functions / 99.13% lines (+450 tests, 2,719 total)

---

## [1.2.9] — 2026-03-06

### Fixed

- **Table ARIA** — Resolve `required-children` violations (`role="presentation"` on header scroll container)
- **Table tabindex** — Remove `tabindex` from viewport so `role="none"` is not ignored by browsers
- **Table row count** — Add `aria-rowcount` on grid, updated dynamically in render loop
- **Selection live region** — Move live region outside `role="grid"` (only `row`/`rowgroup` children allowed)

### Added

- **Table striped rows** — Add striped row style with dedicated `--vlist-bg-striped` variable
- 14 new tests for table renderer striped rows and updated ARIA tests

---

## [1.2.8] — 2026-03-05

### Added

- **Table + Groups compatibility** — `withGroups` now works with `withTable` for sectioned data tables with sticky group headers. Group headers render as full-width rows (no cells, `role="presentation"`, not selectable) and sticky group headers are offset below the table's column header row. The table renderer is configured in-place via `setGroupHeaderFn` — no renderer replacement needed.
  - Table feature exposes `_replaceTableRenderer`, `_updateTableForGroups`, `_getTableHeaderHeight` hooks for groups integration
  - Table renderer: `renderGroupHeaderRow()` for full-width group header rows with custom template
  - Sticky header: `stickyOffset` parameter positions group header below table column header
  - CSS: `.vlist-table-group-header` styles with z-index layering and dark mode support
  - 22 new tests covering group header rendering, type transitions, change tracking, selection guards, and clear/destroy

### Changed

- **Table renderer performance** — three micro-optimizations that also benefit the non-grouped path:
  - `getSizeCache` getter instead of captured reference (fixes stale ref after groups rebuild size cache)
  - `TrackedRow.isGroupHeader` boolean flag replaces `classList.contains()` on hot path
  - `lastHeight` tracking — skips `style.height` writes when height unchanged

---

## [1.2.7] — 2026-03-04

### Added

- **Accessibility: DOM sort on scroll idle** — Screen readers traverse DOM order, not visual order. Virtual list renderers append new elements at the end for performance, causing random DOM order after scrolling. Now, when scrolling stops (idle timeout), DOM children are reordered to match logical `data-index` order. Items are `position: absolute`, so this causes zero visual change — a single lightweight reflow with no geometry impact.
  - New shared utility `sortRenderedDOM()` in `src/rendering/sort.ts` — used by all four render paths (core renderer, grid renderer, masonry renderer, inlined core.ts path)
  - `sortDOM()` method added to `Renderer`, `GridRenderer`, and `MasonryRenderer` interfaces
  - New `idleHandlers` array on `BuilderContext` — features register callbacks that run when scrolling becomes idle (grid and masonry register their `sortDOM()` here)
  - Fast bail-out: uses rendered Map keys (numeric sort) and `firstChild`/`nextSibling` DOM walk to detect already-sorted state — zero work when order is correct

---

## [1.2.6] — 2026-03-04

### Fixed

- **Grid & Masonry: smooth scrollToIndex** — `scrollToIndex` with `behavior: 'smooth'` now uses eased animation (`easeInOutQuad`) instead of instant scroll, matching the core list behavior
- Grid & Masonry: cancel scroll animation on `destroy()` to prevent `rAF` callbacks on torn-down DOM

---

## [1.2.5] — 2026-03-02

### Fixed

- **Scroll: skip core wheel handler when compression is active** — `withScale` owns the scroll in compressed mode; the core wheel handler no longer interferes

---

## [1.2.4] — 2026-03-02

### Fixed

- **Async: deceleration debounce** — during momentum scroll deceleration, velocity drops below the cancel threshold but the render range still changes rapidly, causing a burst of API requests. Now defers loading until scroll stabilises (velocity < 0.5, 120ms timer, or 200ms idle), with immediate flush at scroll boundaries
- Scroll: use actual DOM scroll limit in wheel handler instead of logical total size
- Scroll: reset velocity to zero when wheel events hit scroll boundary

---

## [1.2.3] — 2026-03-02

### Added

- **Striped rows** — `item: { striped: true }` toggles a `.vlist-item--odd` class based on the real item index. Virtual lists recycle DOM elements out of document order so CSS `:nth-child(even/odd)` doesn't match logical position — this option fixes that with a zero-cost bitwise check

### Fixed

- **Accessibility: move `role=listbox`** from root element to items container (direct parent of `role=option` elements), fixing Lighthouse required-children ARIA error. Table sets `role=grid` on items container.
- Scroll: allow horizontal scrolling in wheel handler for tables with wide columns — pass through predominantly horizontal gestures when viewport has horizontal overflow

### Changed

- CSS: swap `selected`/`selected-hover` colors to correct visual hierarchy
- CSS: remove default `border-bottom` from list items
- Table CSS: remove `last-child` `border-right` override on table column borders

---

## [1.2.2] — 2026-03-01

### Fixed

- **Table: center resize handle** on column border with pseudo-element positioning

---

## [1.2.1] — 2026-03-01

### Added

- **`withTable()` feature** — virtualized data table with columns, resize, sort, and horizontal scroll. Rows are the unit of virtualization (same as a plain list), so `withScale`, `withAsync`, `withSelection`, and all other features compose unchanged.
  - Column definitions with `key`, `label`, `width`, `minWidth`, `maxWidth`, `sortable`, `resizable`, `align`, custom `cell` and `header` templates
  - Sticky column header row with sort indicators and drag-to-resize handles
  - `column:sort`, `column:resize`, `column:click` events
  - `setSort()`, `getSort()`, `updateColumns()`, `resizeColumn()`, `getColumnWidths()` API methods
  - Flex columns (no explicit `width`) auto-fill remaining space
  - Dedicated CSS file: `@floor/vlist/styles/table`

### Fixed

- Builder: skip only `undefined` items in render loop, not falsy values
- Table: reset inherited `vlist-item` `border-bottom` on table rows

---

## [1.2.0] — 2026-03-01

### Added

- **Keyboard accessibility** — focus-visible outlines, arrow key navigation (↑/↓/Home/End), Tab support. Selection feature adds `focusVisible` flag for keyboard-only focus outlines. `focusin` handler activates first/last-focused item on Tab.
- **Responsive grid & masonry** — context-injected `columnWidth`, `columns`, and `gap` available in size functions. Elements resize automatically on container resize.

### Changed

- **`withSections` → `withGroups`** — renamed for clarity (breaking for `withSections` users, non-breaking for `withGroups`)
- Selection: scope hover highlight and pointer cursor behind `--selectable` CSS class

### Fixed

- Accessibility: clear focus ring on blur and remove viewport from tab order
- Grid: remove trailing gap at bottom of grid
- Core: defer initial size cache build when grid/masonry will replace it

---

## [1.1.0] — 2026-02-27

### ⚠️ Breaking Changes

- **`BuiltVList` type removed** — use `VList` instead. The canonical public API type is now `VList<T>`.

### Added

- **`VListConfig` type** — convenience config type for framework adapters, extending `BuilderConfig` with fields like `adapter`, `loading`, `layout`, `grid`, `groups`, `selection`, `scrollbar` that adapters translate into `.use(withX())` calls automatically

### Changed

- Renamed `MAX_VIRTUAL_HEIGHT` → `MAX_VIRTUAL_SIZE`, `GridHeightContext` → `GridSizeContext`
- Removed dead legacy types: `VListConfig` (old), `VListUpdateConfig`, `LoadingConfig`, `InternalState`, `RenderedItem`

---

## [1.0.0] — 2026-02-26

### 🎉 Stable Release

The first stable release of vlist — a lightweight, high-performance virtual list with zero dependencies, a composable builder API, and framework adapters for React, Vue, and Svelte.

**2,268 tests · 36,595 assertions · 27.2 KB gzipped (all features) · 0 dependencies**

### Core

- **Builder API** — composable `vlist(config).use(...features).build()` pattern with perfect tree-shaking
- **Zero dependencies** — pure TypeScript/JavaScript, no external libraries
- **Zero-copy architecture** — `setItems()` uses references, O(1) memory complexity (~0.2 MB constant overhead regardless of dataset size)
- **Dimension-agnostic internals** — semantically correct terminology (`size`, `scrollPosition`, `containerSize`) for both vertical and horizontal orientations
- **Full TypeScript** — strict mode, generic over item type, all public APIs typed

### Features

| Feature | Size | Description |
|---------|------|-------------|
| **Base** | 7.7 KB | Core virtualization engine |
| `withGrid()` | +4.0 KB | 2D grid layout with horizontal + vertical orientation |
| `withMasonry()` | +2.9 KB | Pinterest-style shortest-lane placement |
| `withGroups()` | +4.6 KB | Grouped lists with sticky or inline headers, horizontal support |
| `withAsync()` | +5.3 KB | Lazy loading with adapters, sparse storage, network recovery |
| `withSelection()` | +2.3 KB | Single/multiple selection with keyboard navigation |
| `withScale()` | +2.2 KB | 1M+ items via scroll compression with touch support |
| `withScrollbar()` | +1.0 KB | Custom scrollbar UI with auto-hide |
| `withPage()` | +0.9 KB | Document-level scrolling |
| `withSnapshots()` | included | Scroll save/restore for SPA navigation |

### Data Management

- `setItems()`, `appendItems()`, `prependItems()` — bulk operations with zero-copy
- `updateItem(index, partial)` — single-item patch
- `removeItem(index)` — removal by index
- `reload()` — re-fetch from async adapter
- Reverse mode with auto-scroll on append (~2.9 KB gzipped)
- **Network recovery** — `withAsync()` automatically reloads visible placeholders when connectivity returns

### Changed

- **Comprehensive performance optimization** across the entire rendering pipeline, applying a [13-pattern optimization playbook](https://vlist.dev/docs/refactoring/feature-optimization-playbook):
  - **Grid:** flattened interfaces, removed dead methods, DRY data-manager interception, early exit on unchanged scroll, pooled hot-path arrays, reused sets across frames, cached closures, in-place state mutation, DocumentFragment batch insertion, release grace period, change tracking, binary search for visibility
  - **Masonry:** same optimization patterns applied — flattened types, removed dead code, optimized scroll hot path, fixed boundary thrashing
  - **Core renderer:** grace period for DOM element release, change tracking to skip unnecessary updates, lazy DocumentFragment creation
  - **Builder core inlined renderer:** same patterns 9–11 applied for consistency
  - **Selection:** state fed through render pipeline instead of DOM bypass; eliminated O(total) `rebuildIdIndex` for async datasets
  - **Grid tick() removed:** `render()` is now always called directly, relying on change tracking to skip no-ops

### Fixed

- Scale feature: correct scrollbar detection to prevent duplicates

---

## [0.9.9] — 2026-02-24

### Changed

- **Selection performance** — avoid O(total) `rebuildIdIndex` with async data, restoring O(1) ID lookups at scale

### Added

- **Async network recovery** — reload visible placeholders automatically on network reconnect

---

## [0.9.8] — 2026-02-24

### Added

- **Massive test expansion** — 184 new integration, memory, and performance tests across two phases
- Comprehensive `SimpleDataManager` tests
- All 8 remaining TODO test stubs implemented

### Fixed

- Grid: rebuild size cache on resize for dynamic height functions
- Core: use main-axis dimension for `containerSize` in horizontal mode
- Grid: use cross-axis container dimension for horizontal grid sizing
- Grid: swap CSS width/height in horizontal mode for correct aspect ratio

---

## [0.9.6] — 2026-02-24

### Added

- **Mode B auto-measurement** — `MeasuredSizeCache` for automatic item size detection without predefined heights
- **Placeholder length profiles** — per-item skeleton sizing from first batch data, CSS-driven
- **Snapshot enhancements** — restore config, `total` in snapshot, NaN guard
- **Async `autoLoad` option** — defer initial data loading for manual control
- **Async `storage` config** — control chunk size for sparse storage
- **Scroll config** — `scroll.wheel` and `scroll.scrollbar` options for fine-grained control

### Fixed

- Snapshots: restore scroll position with async `autoLoad: false`
- Async: restore placeholder replacement in `onItemsLoaded` and `reload`
- Async: prevent duplicate requests on reload and optimize initial load
- Scale: prevent scroll beyond bottom + rename variables for horizontal support
- Page: prevent scroll conflicts in window scroll mode
- Types: add `ScrollConfig` type annotation

---

## [0.9.2] — 2026-02-22

### Changed

- **Plugin → Feature terminology** — complete migration from "plugin" to "feature" across the codebase
- Test reorganization to mirror `src/` structure
- Test coverage improved to **97.54%**

### Fixed

- Remove unused `Range` import in groups
- Resolve all TypeScript errors in test files

---

## [0.9.1] — 2026-02-21

### Added

- **Horizontal grid layouts** — `withGrid()` now supports `orientation: 'horizontal'` for 2D grids in both axes

### Fixed

- Builder: use correct container dimension for horizontal orientation
- Grid: swap axes for horizontal orientation positioning

---

## [0.9.0] — 2026-02-21

### ⚠️ Breaking Changes

- **`direction` → `orientation`** — renamed for semantic clarity
- **`HeightCache` → `SizeCache`** — all height-specific APIs renamed to dimension-agnostic equivalents
- **`scrollTop` → `scrollPosition`** — in `ViewportState` and scroll events
- See [Migration Guide](https://vlist.dev/docs/refactoring/v0.9.0-migration-guide.md)

### Added

- **Dimension-agnostic architecture** — all internal APIs use semantically correct terminology (`size`, `scrollPosition`, `containerSize`) that works for both vertical and horizontal orientations
- **Horizontal groups** — sticky headers work in horizontal carousels

### Changed

- Complete codebase refactoring from height-centric to size-centric naming
- `CompressionState` updated to use size terminology

---

## [0.8.2] — 2026-02-20

### Fixed

- **Selection: restore O(1) ID lookups** — prevent `selectAll` freeze on large datasets

---

## [0.8.1] — 2026-02-20

### Added

- **Wheel interception** — prevent Chrome/Safari scroll race condition for smoother scrolling

### Changed

- Reverted overscan to 3 (wheel interception makes large overscan unnecessary)
- Wheel handler applied to all browsers (removed browser detection)

### Fixed

- Disable wheel interception on mobile devices
- Accurate visible item counting to prevent blank areas during fast scrolling
- TypeScript declaration generation errors

---

## [0.8.0] — 2026-02-20

### Changed

- **Memory optimization** — zero-copy architecture enabled by default
  - `setItems()` uses references instead of copying arrays
  - O(1) memory complexity regardless of dataset size
  - ~0.2 MB constant overhead for 10K–100K items
- **Builder decomposition** — `core.ts` decomposed with refs-object pattern for maintainability and reduced bundle size
- Removed deprecated core files, simplified build

### Fixed

- TypeScript declaration generation errors
- `removeItem` tests updated to use index parameter

---

## [0.7.6] — 2026-02-19

### Added

- **Scale: touch scroll support** — compressed mode now works on iOS/mobile devices

### Fixed

- Scale: smooth scroll interpolation to fix Firefox compressed scroll-up bug
- Async: `reload` now clears DOM, shows placeholders, and loads only visible range
- Async: prevent endless `loadMore` cascade at bottom of sparse lists
- Builder: add missing `invalidateRendered` stub to simplified context

---

## [0.7.3] — 2026-02-18

Initial tracked release with core virtual list functionality:

- Builder API with composable features
- `withGrid()`, `withGroups()`, `withAsync()`, `withSelection()`, `withScale()`, `withScrollbar()`, `withPage()`, `withSnapshots()`
- React, Vue, and Svelte framework adapters
- Zero dependencies
- Full TypeScript support

---

[1.3.8]: https://github.com/floor/vlist/compare/v1.3.7...v1.3.8
[1.3.7]: https://github.com/floor/vlist/compare/v1.3.6...v1.3.7
[1.3.6]: https://github.com/floor/vlist/compare/v1.3.5...v1.3.6
[1.3.5]: https://github.com/floor/vlist/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/floor/vlist/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/floor/vlist/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/floor/vlist/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/floor/vlist/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/floor/vlist/compare/v1.2.9...v1.3.0
[1.2.9]: https://github.com/floor/vlist/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/floor/vlist/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/floor/vlist/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/floor/vlist/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/floor/vlist/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/floor/vlist/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/floor/vlist/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/floor/vlist/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/floor/vlist/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/floor/vlist/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/floor/vlist/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/floor/vlist/compare/v0.9.9...v1.0.0
[0.9.9]: https://github.com/floor/vlist/compare/v0.9.8...v0.9.9
[0.9.8]: https://github.com/floor/vlist/compare/v0.9.6...v0.9.8
[0.9.6]: https://github.com/floor/vlist/compare/v0.9.2...v0.9.6
[0.9.2]: https://github.com/floor/vlist/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/floor/vlist/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/floor/vlist/compare/v0.8.2...v0.9.0
[0.8.2]: https://github.com/floor/vlist/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/floor/vlist/compare/v0.7.6...v0.8.1
[0.8.0]: https://github.com/floor/vlist/compare/v0.7.6...v0.8.0
[0.7.6]: https://github.com/floor/vlist/compare/v0.7.3...v0.7.6
[0.7.3]: https://github.com/floor/vlist/releases/tag/v0.7.3