# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Accessibility: DOM sort on scroll idle** — Screen readers traverse DOM order, not visual order. Virtual list renderers append new elements at the end for performance, causing random DOM order after scrolling. Now, when scrolling stops (idle timeout), DOM children are reordered to match logical `data-index` order. Items are `position: absolute`, so this causes zero visual change — a single lightweight reflow with no geometry impact.
  - New shared utility `sortRenderedDOM()` in `src/rendering/sort.ts` — used by all four render paths (core renderer, grid renderer, masonry renderer, inlined core.ts path)
  - `sortDOM()` method added to `Renderer`, `GridRenderer`, and `MasonryRenderer` interfaces
  - New `idleHandlers` array on `BuilderContext` — features register callbacks that run when scrolling becomes idle (grid and masonry register their `sortDOM()` here)
  - Fast bail-out: uses rendered Map keys (numeric sort) and `firstChild`/`nextSibling` DOM walk to detect already-sorted state — zero work when order is correct

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