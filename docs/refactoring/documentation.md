# Documentation Refactoring — v1.1.0 Audit

> Systematic audit and rewrite of vlist documentation against source code, started after v1.0.0 and continued through v1.1.0.

---

## Motivation

After the v1.0.0 release, the docs had drifted significantly from the source. The API reference documented methods that didn't exist (`scrollToItem`, `update`), described features incorrectly (`withPage` was described as wizard navigation instead of window scrolling), used wrong constant values, and had a monolithic 1,159-line reference page where most content was unreachable from the TOC.

The refactoring was executed in five phases:

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | API Reference section — full rewrite of 5 files | ✅ Complete |
| **Phase 2** | Cross-cutting fixes — stale references, broken links, version alignment | ✅ Complete |
| **Phase 3** | Feature docs — import paths, API patterns, deprecated names, broken links | ✅ Complete |
| **Phase 4** | Structural refactoring — split heavy docs, restructure for user journey, archive stale pages | ✅ Complete |
| **Phase 5** | Missed files, archive housekeeping, compatibility matrix, README alignment | ✅ Complete |

---

## Phase 1 — API Reference

Full rewrite of the `api/` section plus internals, source code, and server-side TOC.

### api/reference.md — Full rewrite

**Before:** 1,159 lines, version "v0.8", everything buried under H3/H4, TOC showed only 8 items.

**After:** ~500 lines, focused on core API only, every section reachable from a two-level TOC.

| Change | Detail |
|--------|--------|
| Structure | Flat H2/H3 hierarchy — Configuration, Properties, Methods each with nested children visible in TOC |
| Version | Removed stale "v0.8" reference |
| `scrollToItem` | Removed — method was deleted from source. Added migration note under `scrollToIndex` |
| `update()` | Removed — method never existed in builder API |
| `withPage` description | Removed fiction about `nextPage`/`prevPage`/`goToPage` — links to correct `features/page.md` |
| Feature sections | Removed all duplicate feature docs — replaced with See Also linking to `features/overview.md` |
| `estimatedHeight` / `estimatedWidth` | Added to `ItemConfig` with Mode A vs Mode B decision guidance |
| Sizing vocabulary | Changed "height" to "size" in descriptions — matches axis-neutral `SizeCache` architecture |
| Scaling note | Explicitly states all three size variants (fixed, variable, measured) work with `withScale` compression |
| `GridHeightContext` | Removed from reference — grid-specific detail belongs in `features/grid.md` |
| `reverse` description | Broadened from "chat UIs" to behavior-focused: "bottom-anchored content: chat, logs, activity feeds, timelines" |
| `on` / `off` | Added as proper method entries (were previously only in the Events section) |
| Events, Types, Low-Level Exports, Feature Authoring | Moved out to dedicated pages |

### api/exports.md — New file

Created from content extracted from `reference.md`. Contains:
- All low-level rendering, scale, selection, sections, grid, masonry, async, emitter, scrollbar exports
- Feature authoring guide with `VListFeature` interface, `BuilderContext` hooks and utilities

### navigation.json

- Added `api/exports` entry to sidebar ("Exports — Low-level utilities and feature authoring")
- Updated Reference description to "Config, properties, and methods"

### Server: two-level TOC

**`src/server/renderers/content.ts`:**
- `extractToc()` — expanded regex to capture both H2 and H3 headings
- `buildToc()` — H3 items nest inside their parent H2's `<li>` as a `<ul class="toc__sublist">`

**`styles/shell.css`:**
- Added `.toc__sublist`, `.toc__link--sub`, `.toc__link--sub:hover`, `.toc__link--sub.toc__link--active`

This is a global change — all docs pages now support two-level TOC navigation.

### features/overview.md

- Removed two `update()` calls that referenced a non-existent method
- Fixed `cancelThreshold` default from 15 to 5 (matches source constant `CANCEL_LOAD_VELOCITY_THRESHOLD = 5`)

### features/async.md

- Fixed `cancelThreshold` default from 15 to 5 in code example and description

### features/page.md

- Removed `scrollToItem` from API example

### features/scrollbar.md

- Fixed stale cross-reference `reference#snapshot-methods` → `./snapshots.md`
- Removed `scrollToItem` from `scroll.wrap` note

### Source code (vlist)

| Change | Detail |
|--------|--------|
| `MAX_VIRTUAL_HEIGHT` → `MAX_VIRTUAL_SIZE` | Renamed constant across all source files. Old name kept as deprecated alias for backwards compatibility. |
| `GridHeightContext` → `GridSizeContext` | Renamed type across all source files. Old name kept as deprecated type alias. |
| `CANCEL_LOAD_VELOCITY_THRESHOLD` comment | Fixed stale "Default: 25" → "Default: 5" in constants.ts |
| `DataFeatureConfig.cancelThreshold` JSDoc | Fixed stale "Default: 25" → "Default: 5" in async/feature.ts |
| Axis-neutral comments in `rendering/scale.ts` | "height" → "size" in module doc, `CompressionState` field docs, and `getCompressionState` logic |
| Axis-neutral comments in `rendering/viewport.ts` | "capped at MAX_VIRTUAL_HEIGHT" → "capped at MAX_VIRTUAL_SIZE" |

All changes pass TypeScript compilation and 2,268 tests (0 failures).

### api/types.md — Full rewrite

**Before:** 884 lines documenting stale pre-builder `VListConfig` with top-level `adapter`, `selection`, `scrollElement`. `VList` interface listed `scrollToItem` (removed) and showed all feature methods as always-available. Missing `estimatedHeight`/`estimatedWidth`, `GridSizeContext`. No `BuilderContext` documentation.

**After:** ~930 lines with flat H2/H3 structure matching reference.md. Every type verified against `src/types.ts` and `src/builder/types.ts`.

| Change | Detail |
|--------|--------|
| Structure | Flat H2 sections: Item Types, Configuration Types, Selection Types, Adapter Types, State Types, Event Types, Feature Types, Builder & Feature Types, Public API Types, Rendering Types, Emitter Types, Deprecated Types |
| `VListConfig` | Replaced with `BuilderConfig` — no more top-level `adapter`, `selection`, `scrollElement` |
| `ItemConfig` | Added `estimatedHeight`, `estimatedWidth`, `GridSizeContext` context parameter on `height` |
| `GridSizeContext` | New section with `containerWidth`, `columns`, `gap`, `columnWidth` |
| `ScrollConfig` | Documented as nested `scroll` property with `wheel`, `wrap`, `idleTimeout`, `element`, `scrollbar` |
| `ScrollbarOptions` | Added `showOnHover`, `hoverZoneWidth`, `showOnViewportEnter` |
| `VList` | Feature methods (`select`, `getScrollSnapshot`, etc.) marked optional with `?`. `scrollToItem` removed with note. |
| `BuilderContext` | Full interface documented — core components, mutable components, state, handler slots, method registration, helpers, advanced hooks |
| `VListFeature` | New section documenting feature interface (`name`, `priority`, `setup`, `destroy`, `methods`, `conflicts`) |
| `VListBuilder` | New section with `.use()` and `.build()` |
| Feature types | `GroupsConfig`, `GridConfig`, `MasonryConfig` documented |
| Rendering types | `SizeCache`, `DOMStructure`, `CompressionContext`, `CompressionState`, `Renderer`, `ElementPool` |
| Emitter types | `Emitter`, `EventMap` |
| Deprecated types | `ScrollbarConfig`, `GridHeightContext` marked deprecated |
| Events | `VListEvents` includes `item:dblclick`, `velocity:change`, `resize` |
| `InternalState` | Removed — not a public type |

### api/constants.md — Full rewrite

**Before:** Wrong values for multiple constants, stale constant names, used `MAX_VIRTUAL_HEIGHT` instead of `MAX_VIRTUAL_SIZE`.

**After:** All values verified against `src/constants.ts` and `src/builder/velocity.ts`.

| Change | Detail |
|--------|--------|
| `VELOCITY_SAMPLE_COUNT` | Fixed 8 → 5 (builder tracker). Documented two independent velocity trackers. |
| `MIN_RELIABLE_SAMPLES` | Fixed 3 → 2 (builder tracker) |
| `DEFAULT_MASK_CHARACTER` | Fixed '█' → 'x' |
| `DEFAULT_CANCEL_THRESHOLD` | Renamed to `CANCEL_LOAD_VELOCITY_THRESHOLD`, fixed value 25 → 5 |
| `DEFAULT_PRELOAD_THRESHOLD` | Renamed to `PRELOAD_VELOCITY_THRESHOLD` |
| `DEFAULT_PRELOAD_AHEAD` | Renamed to `PRELOAD_ITEMS_AHEAD` |
| `MAX_VIRTUAL_HEIGHT` | Replaced with `MAX_VIRTUAL_SIZE`, old name documented as deprecated alias |
| Velocity section | Added table explaining two independent velocity trackers (builder vs scrollbar controller) with different constants |
| Structure | Flat H2/H3, removed verbose "Purpose" paragraphs, tightened descriptions |

### api/events.md — Rewrite with missing events

**Before:** Missing `item:dblclick`, `velocity:change`, `resize`. Heavy on emitter internals, light on actual event documentation.

**After:** Focused on events as a user reference. Each event has payload table.

| Change | Detail |
|--------|--------|
| `item:dblclick` | Added with full payload table |
| `velocity:change` | Added with `velocity` (px/ms) and `reliable` flag, explanation of stale gap behavior |
| `resize` | Added with `height` and `width` fields |
| `load:end` | Added missing `offset` field |
| Structure | Grouped into Interaction, Scroll, Data, Lifecycle sections. Flat H2/H3. |
| Emitter internals | Moved to compact "Emitter Implementation" section at bottom |
| Complete Event Map | Added full `VListEvents` interface as quick reference |

### internals/context.md — Full rewrite

**Before:** Documented `createContext()` function and `VListContext` interface that don't exist. Referenced `vlist.ts`, `handlers.ts`, `methods.ts`, `animation.ts` — all refactored away.

**After:** Documents `BuilderContext` from `src/builder/types.ts`. Accurate creation flow, handler registration, method registration, helper tables.

| Change | Detail |
|--------|--------|
| `createContext` / `VListContext` | Replaced entirely with `BuilderContext` |
| `VListContextConfig` | Replaced with `ResolvedBuilderConfig` (correct fields: `overscan`, `classPrefix`, `reverse`, `wrap`, `horizontal`, `ariaIdPrefix`) |
| `VListContextState` | Replaced with `BuilderState` |
| Creation flow | Accurate 13-step sequence from `vlist(config)` through `.build()` |
| Module structure | Points to `src/builder/` directory (core.ts, types.ts, data.ts, dom.ts, pool.ts, velocity.ts) |
| Handler registration | Documented all slots: `afterScroll`, `clickHandlers`, `keydownHandlers`, `resizeHandlers`, `contentSizeHandlers`, `destroyHandlers` |
| Method registration | Documented `methods` Map pattern |
| Helpers | Tables for Data Access, Rendering, Compression, Size & Layout, Scroll |
| Advanced hooks | All `set*Fn` methods documented with purpose |
| Feature example | Minimal `withVisibleCount` feature showing the pattern |
| Runtime flows | Updated scroll, click, destroy flow diagrams |

### internals/rendering.md — Fix stale references

**Before:** Used `heights.ts`, `createHeightCache`, `scrollTop`, `containerHeight`, `totalHeight`, `actualHeight`, `MAX_VIRTUAL_HEIGHT`. `createRenderer` signature accepted `itemHeight: number`. `CompressionContext` used `scrollTop`/`containerHeight`. `CompressionState` used `actualHeight`/`virtualHeight`.

**After:** All references verified against `src/rendering/sizes.ts`, `src/rendering/viewport.ts`, `src/rendering/renderer.ts`, `src/rendering/scale.ts`.

| Change | Detail |
|--------|--------|
| `heights.ts` | Already correct (`sizes.ts`) in module structure — no change needed |
| `createRenderer` signature | `itemHeight: number` → `sizeCache: SizeCache`. Added `ariaIdPrefix`, `horizontal`, `crossAxisSize`, `compressionFns` parameters. |
| `Renderer` interface | Added `updateItemClasses` method |
| `CompressionContext` | `scrollTop` → `scrollPosition`, `containerHeight` → `containerSize` |
| `ViewportState` | `scrollTop` → `scrollPosition`, `containerHeight` → `containerSize`, `totalHeight` → `totalSize`, `actualHeight` → `actualSize` |
| `createViewportState` | Accepts `sizeCache` + `compression` + optional `visibleRangeFn` instead of `itemHeight` |
| `updateViewportState` | Same parameter changes |
| `updateViewportSize` | Same parameter changes |
| `updateViewportItems` | Same parameter changes |
| `calculateVisibleRange` | Replaced with `simpleVisibleRange` (a `VisibleRangeFn`) |
| `calculateRenderRange` | Added `out` parameter for zero-allocation |
| `calculateScrollToIndex` | Accepts `sizeCache` + `compression` + optional `scrollToIndexFn` |
| `getCompressionState` | Accepts `sizeCache` instead of `itemHeight` |
| `CompressionState` | `actualHeight` → `actualSize`, `virtualHeight` → `virtualSize` |
| `MAX_VIRTUAL_HEIGHT` | → `MAX_VIRTUAL_SIZE` with deprecated alias noted |
| Range utilities | Added `rangeToIndices`, `calculateTotalSize`, `calculateActualSize`, `calculateItemOffset` |
| Compressed functions | Updated all to use `sizeCache` instead of `itemHeight`, `scrollPosition` instead of `scrollTop` |
| DOM paths | `src/render/dom.ts` → `src/builder/dom.ts`, `src/render/pool.ts` → `src/builder/pool.ts` |
| Content height | Added `updateContentWidth` alongside `updateContentHeight` |
| Usage examples | Updated to use `createSizeCache` + `compression` parameter |
| Key Concepts | Promoted to H2 sections for flat TOC |

### TOC: strip backticks from headings (project-wide)

**Problem:** `marked` passes heading text as raw markdown to the custom heading renderer. Backticks in headings like `` ### `item:click` `` survive as literal `` ` `` characters in the TOC — they are never converted to `<code>` tags and therefore never stripped by `extractToc`'s HTML tag removal. The result is noisy TOC entries showing `` `item:click` `` instead of `item:click`.

**Fix:** Removed backticks from all H2/H3/H4 headings across every non-archive docs page. Matches the convention already used in `reference.md`.

| File | Headings fixed |
|------|---------------|
| `api/events.md` | 12 (all event names + `createEmitter`) |
| `api/constants.md` | 22 (all constant names) |
| `internals/rendering.md` | 15 (all function/type names) |
| `internals/context.md` | 14 (all component/slot names) |
| `features/scrollbar.md` | 8 (`scroll.*` options + internal functions) |
| `features/selection.md` | 19 (all selection/focus/query functions) |
| `features/async.md` | 8 (config options + internal functions) |
| `features/placeholders.md` | 3 (`maskCharacter`, `maxSampleSize`, `createPlaceholderManager`) |
| `features/snapshots.md` | 2 (`withSnapshots(config?)`, `getScrollSnapshot()`) |

`archive/` files left untouched — historical snapshots, not served to users.

---

## Phase 2 — Cross-Cutting Fixes

Systematic pass across all user-facing docs to fix stale references, broken links, and version drift accumulated during the v0.8 → v1.1.0 transition.

### getting-started.md

| Fix | Detail |
|-----|--------|
| `scrollToItem` removed | Stale method call in Scroll Methods example |
| `VListConfig` → `BuilderConfig` | Type name in Core Config Options section |
| `reverse` description | Broadened from "chat and messaging UIs" to behavior-focused |
| Broken relative links | `./chat-interface`, `./optimization`, `./styling` → absolute `/tutorials/` paths |

### README.md (docs index)

| Fix | Detail |
|-----|--------|
| Broken markdown links | `[Methods]/docs/api/reference)` → `[Methods](./api/reference.md)` in two places (missing `(` in link syntax) |

### internals/structure.md

| Fix | Detail |
|-----|--------|
| `heights.ts` → `sizes.ts` | Rendering System tree and description |
| `createHeightCache` → `createSizeCache` | Key exports list and Internal Imports example |
| `calculateTotalHeight` → `calculateTotalSize` | Key exports list |
| `VListConfig` → `BuilderConfig` | types.ts description |
| Version footer | "v0.8+" / "January 2026" → "v1.1.0" / "February 2026" |

### internals/orientation.md

| Fix | Detail |
|-----|--------|
| `VListConfig.orientation` | → `BuilderConfig.orientation` with correct file reference to `builder/types.ts` |

### resources/testing.md

| Fix | Detail |
|-----|--------|
| Test stats | 2,107 → **2,268 tests**, 5,673 → **36,595 assertions**, 42 → **45 files**, ~20s → **~18s** |

### overview.json (homepage cards)

| Fix | Detail |
|-----|--------|
| Missing card | Added `api/exports` to API Reference section |
| Testing card | Updated description from "1,181 tests" to "2,268 tests passing, 36,595 assertions" |

### features/scrollbar.md

| Fix | Detail |
|-----|--------|
| `VListConfig` → `BuilderConfig` | Two references in Scroll Configuration and createScrollController description |

### features/sections.md

| Fix | Detail |
|-----|--------|
| "Chat UI" labeling | "Chat UI with Date Headers" → "Reverse Mode with Date Headers"; "chat UIs" → "bottom-anchored UIs (chat, logs, activity feeds)" in 3 places |

### features/masonry.md, features/scale.md

| Fix | Detail |
|-----|--------|
| Version footers | "0.5.0+" → "v1.0.0+"; "v0.8.0" → "v1.0.0" |

---

## Phase 3 — Feature Docs

Systematic pass across all 8 `features/*.md` files to fix import paths, API patterns, deprecated names, and broken links.

### Import path: `'vlist'` → `'@floor/vlist'`

The npm package name is `@floor/vlist`. All code examples must use the scoped name.

| File | Occurrences fixed |
|------|-------------------|
| `features/page.md` | 6 |
| `features/snapshots.md` | 7 |
| `features/sections.md` | 3 (also combined split `import { vlist } from` / `import { withX } from` into single imports) |
| `features/scrollbar.md` | 2 |
| `features/placeholders.md` | 1 |
| `features/async.md` | 1 (also removed non-existent `'vlist/async'` sub-path import) |
| `features/selection.md` | 4 (changed `'./selection'` internal paths to `'@floor/vlist'`) |

**Not changed:** `grid.md` migration section — `import { createVList } from 'vlist'` is intentionally showing the old API in a "Before" example.

### Non-existent sub-path imports removed

| File | Removed | Replaced with |
|------|---------|---------------|
| `features/async.md` | `import { withAsync } from 'vlist/async'` | `import { vlist, withAsync } from '@floor/vlist'` |
| `features/snapshots.md` | `import { withSnapshots } from 'vlist/snapshots'` | Single import from `'@floor/vlist'` |

### features/selection.md — Old monolithic API

**Before:** "With VList" example used pre-builder config with `selection: { mode: 'multiple', initial: [...] }` at the top level, no `.use()` / `.build()`.

**After:** Builder pattern with `.use(withSelection({ mode: 'multiple', initial: ['user-1'] })).build()`.

Also fixed: broken link `[optimization.md]/tutorials/optimization)` → `[Optimization](/tutorials/optimization)`.

### features/async.md — Complete Integration example

**Before:** Used old monolithic API with `adapter: { ... }` at top level. Had duplicate `const isLoading` line from previous partial edit.

**After:** Builder pattern with `.use(withAsync({ adapter: { ... } })).build()`. Single clean `isLoading` check.

### features/page.md

| Fix | Detail |
|-----|--------|
| `cancelThreshold: 15` → `5` | Combining with Async Loading example (matches source `CANCEL_LOAD_VELOCITY_THRESHOLD = 5`) |
| `./README.md` → `./overview.md` | See Also link (no `README.md` exists in `features/`) |

### features/snapshots.md

| Fix | Detail |
|-----|--------|
| Bundle cost footer | "Opt-in feature (tree-shakeable)" → "Included in base (0 KB additional)" — matches `overview.md` which says 0 KB |
| `./README.md` → `./overview.md` | See Also link |

### features/sections.md

| Fix | Detail |
|-----|--------|
| `./README.md` → `./overview.md` | Further Reading link |

### features/scale.md

| Fix | Detail |
|-----|--------|
| `MAX_VIRTUAL_HEIGHT` → `MAX_VIRTUAL_SIZE` | Exported Utilities import example and Constants section |

### features/scrollbar.md

| Fix | Detail |
|-----|--------|
| `render.md` → `Rendering` | Related Modules link text (path was already correct) |

---

## Phase 4 — Structural Refactoring

Restructured the three heaviest feature docs and cleaned up stale resource pages.

### features/scrollbar.md — Split into user guide + internals

**Before:** 1,409 lines mixing user-facing configuration with deep implementation details (native mode, wheel interception, velocity circular buffer, scroll position conversion, track click/thumb drag code, smooth scroll rendering fix).

**After:** Two focused pages:

| Page | Lines | Content |
|------|-------|---------|
| `features/scrollbar.md` | ~820 | Scroll configuration, key concepts, usage examples, scrollbar styling, migration |
| `internals/scrollbar.md` | ~584 | `createScrollController`, `createScrollbar`, utility functions, scroll mode implementations, velocity sampling, scrollbar interactions, technical notes |

| Change | Detail |
|--------|--------|
| API Reference section | Moved to `internals/scrollbar.md` — `createScrollController`, `ScrollController`, `ScrollEventData`, `createScrollbar`, `Scrollbar`, `rafThrottle`, scroll position utilities |
| Implementation Details section | Moved — native mode, window mode, compressed mode, wheel interception, scroll position conversion, native scrollbar hiding, idle detection |
| Performance Considerations section | Moved — passive listeners, RAF throttling, velocity sampling circular buffer |
| Scrollbar Interactions section | Moved — track click, thumb drag |
| Technical Notes section | Moved — smooth scroll rendering fix (v0.4.0) |
| Complete Manual Integration example | Moved to internals page |
| Velocity Tracking concept | Kept in user guide (behavioral description), linked to internals for circular buffer implementation |
| Related Modules | Added link to new internals page; cleaned up link text (removed `.md` extensions, absolute paths) |
| `methods.md` link | Fixed stale `methods.md#snapshot-methods` → `./snapshots.md` |
| Full ScrollConfig Interface heading | Removed backticks (missed in Phase 1 sweep) |

Navigation and overview updated:
- `navigation.json` — added `internals/scrollbar` entry
- `overview.json` — added `internals/scrollbar` and `internals/measurement` cards

### features/selection.md — Restructured to lead with builder API

**Before:** Led with pure functions (`createSelectionState`, `selectItems`, `deselectItems`, etc.), had "With VList" example buried at the bottom of Usage Examples. ~370 lines dominated by low-level API that most users never call.

**After:** ~450 lines structured for the typical user journey:

| Section | Content |
|---------|---------|
| **withSelection Configuration** | Builder pattern example, config options table |
| **Instance Methods** | `list.select()`, `list.deselect()`, `list.toggleSelect()`, `list.selectAll()`, `list.clearSelection()`, `list.getSelected()`, `list.getSelectedItems()` |
| **Events** | `selection:change` with payload table |
| **Template State** | `selected` and `focused` in template third argument |
| **Keyboard Navigation** | Key → action table |
| **Usage Examples** | Single selection, multi-select with initial, programmatic selection, range selection |
| **Internals** | `SelectionState`, pure functions (compact signatures), focus management, queries, keyboard helpers, implementation notes, complete keyboard handler example |

| Change | Detail |
|--------|--------|
| Opening tagline | "Pure functions for managing selection state" → "Single, multi, and keyboard-navigated item selection" |
| Overview bullets | Replaced "Pure Functions" with "Programmatic Control" |
| `withSelection` example | Now the first code block on the page (was buried under 200+ lines of pure functions) |
| Instance methods | New section documenting `list.select()` etc. — the actual API most users need |
| Events section | New dedicated section for `selection:change` |
| Template State section | New section documenting `selected`/`focused` in template third arg |
| Pure functions | Moved to Internals section with compact signatures (removed redundant JSDoc-style descriptions) |
| `moveFocusUp`/`moveFocusDown` | Combined into single subsection |
| `moveFocusToFirst`/`moveFocusToLast` | Combined into single subsection |
| Performance notes | Consolidated into single "Implementation Notes" paragraph instead of repeated per-function callouts |
| Queries | Collapsed to compact signature list (5 functions in one block) |
| Related Modules | Deduplicated (had two `context.md` links), fixed path `methods.md` → `reference.md` |
| Closing tagline | Updated to match new focus |

### features/async.md — Restructured to lead with builder API

**Before:** Led with `withAsync` config (good), but Complete Integration example was buried at line 619 after 450 lines of `createDataManager`, `createSparseStorage`, `createPlaceholderManager` internals. Usage examples mixed low-level `createDataManager` calls with builder patterns.

**After:** ~630 lines structured for the typical user journey:

| Section | Content |
|---------|---------|
| **withAsync Configuration** | Builder pattern, config options |
| **Complete Integration** | Moved up from line 619 to immediately after config — the first full example users see |
| **Usage Examples** | Deferred loading, custom chunk size, placeholder detection in templates |
| **Key Concepts** | Sparse storage, placeholder generation, data flow, chunk-based loading, deduplication |
| **Memory Management** | Eviction, configuration guidelines, stats monitoring |
| **Performance Optimizations** | Batched LRU timestamps, direct getters vs getState() |
| **Internals** | `createDataManager`, `createSparseStorage`, `createPlaceholderManager`, utility functions |

| Change | Detail |
|--------|--------|
| Complete Integration | Moved from line 619 to line 83 — first full example on the page |
| Placeholder detection | New compact example in Usage Examples (extracted from old Placeholder System example) |
| Chunk-Based Loading | Moved up from bottom of file into Key Concepts |
| Deduplication | Moved up from bottom of file into Key Concepts |
| Low-level usage examples | Removed standalone `createDataManager`, `createSparseStorage`, `createPlaceholderManager` examples (Basic Data Manager, With Async Adapter, Sparse Storage, Placeholder System, Batched LRU Timestamps, Direct State Getters). These showed internal APIs with wrong import paths (`'./data'`). |
| Internals section | New labeled section containing all three `create*` APIs and utility functions |
| DataManager getters comment | Trimmed redundant inline comment (behavior already documented in Performance Optimizations) |
| Related Modules | Deduplicated (had two `context.md` links), added `Placeholders` link |
| Closing tagline | Updated to reference `withAsync()` |

### resources/roadmap.md — Reframed as architecture page

**Before:** "Roadmap Completion Analysis" — 317 lines saying "ready for 1.0" with version "0.9.5", stale test counts (1,635 tests — now 2,268), duplicated bundle sizes, full example/tutorial/benchmark inventories already covered elsewhere.

**After:** "Architecture & Competitive Position" — ~180 lines focused on:

| Section | Content |
|---------|---------|
| Builder Pattern Architecture | Feature isolation, source structure, zero-allocation hot path, prefix-sum size cache |
| Competitive Position | Feature comparison table, bundle size comparison, unique differentiators |
| Framework Adapters | Adapter table, design principle |
| Item Sizing Modes | Mode A vs Mode B summary with link to measurement internals |
| Development History | Phase summary table, scope note |

| Change | Detail |
|--------|--------|
| Title | "Roadmap Completion Analysis" → "Architecture & Competitive Position" |
| Tagline | Removed "measured against the original roadmap" framing |
| Version | "0.9.5" / "Ready for 1.0" → "1.1.0" |
| Executive Summary | Removed (all items shipped — no longer newsworthy) |
| Scoreboard | Removed (14/14 shipped, no information value) |
| By The Numbers | Removed (duplicated in testing.md, bundle-size.md) |
| Test coverage table | Removed (duplicated in testing.md) |
| Largest source files table | Removed (low user value) |
| Live Documentation Site | Removed (examples/tutorials/benchmarks listed on their own pages) |
| Auto-Size Measurement deep dive | Replaced with 4-line summary + link to measurement.md |
| "What Exceeded the Original Roadmap" | Condensed to single paragraph in Development History |
| Health Indicators | Removed (all green — no action items) |
| Conclusion | Removed (was "the objective has been reached" victory lap) |
| Feature comparison | Added masonry layout row (missing from original) |
| Package names | `vlist-react` → `@floor/vlist-react` etc. (scoped names) |
| Known Issues link | Removed from Related Documentation (file archived) |
| Dependency Analysis link | Removed (not user-facing) |
| Navigation | `navigation.json`: "Roadmap" → "Architecture", updated desc |
| Overview | `overview.json`: same rename, updated desc |

### resources/known-issues.md — Archived

**Before:** 693 lines of pre-builder API code examples (`layout: 'grid'`, `groups` at top level, `scrollToItem`, `import from 'vlist'`). All 14 items marked ✅. Essentially a historical document with no current user value.

**After:** Moved to `archive/known-issues.md`. Removed from `overview.json` (was showing "Current limitations and workarounds" — misleading since all items are resolved). Not in `navigation.json` (was already absent from sidebar).

### Not needed (verified accurate)

| File | Status |
|------|--------|
| **features/overview.md** | ✅ Accurate — all 8 features with correct examples and bundle costs |
| **features/grid.md** | ✅ Accurate — documents `GridSizeContext` (still uses `GridHeightContext` alias inline which is fine) |
| **features/masonry.md** | ✅ Accurate — matches source |
| **features/page.md** | ✅ Accurate (after Phase 3 fixes) |
| **features/snapshots.md** | ✅ Accurate (after Phase 3 fixes) — `SnapshotConfig.restore` correctly documented |
| **features/placeholders.md** | ✅ Accurate — per-item length profiles, CSS class detection, template guidelines |
| **features/scale.md** | ✅ Accurate (after Phase 3 fixes) — compression architecture, scroll controller modes |
| **internals/measurement.md** | ✅ Accurate — describes Mode B architecture correctly |
| **internals/orientation.md** | ✅ Accurate (after Phase 2 fix) — axis-neutral SizeCache |
| **internals/structure.md** | ✅ Accurate (after Phase 2 fixes) — correct file names, exports, version |
| **resources/bundle-size.md** | ✅ Accurate — sizes and tree-shaking info still valid |
| **resources/benchmarks.md** | ✅ Accurate — benchmark methodology unchanged |
| **resources/testing.md** | ✅ Accurate (after Phase 2 fix) — 2,268 tests / 36,595 assertions |

---

## Phase 5 — Missed Files, Archive, Compatibility

Phases 1–4 left `grid.md` and `masonry.md` marked "✅ Accurate" without catching their import paths, plus stale internal directories served alongside user-facing docs.

### features/grid.md — Import paths, stale feature names, stale links

**Before:** 10 code blocks used `'vlist/builder'` + `'vlist/grid'` sub-path imports. "Combining with Other Features" section used `withAdapter` (from `'vlist/adapter'`), `withGroups` (from `'vlist/groups'`), `withScrollbar` (from `'vlist/scroll'`) — none of which exist. Related Documentation linked to non-existent files (`/docs/builder.md`, `/docs/features/groups.md`, `/docs/features/adapter.md`).

| Change | Detail |
|--------|--------|
| All imports | `'vlist/builder'` + `'vlist/grid'` etc. → single `'@floor/vlist'` import (10 code blocks) |
| `withAdapter` | → `withAsync` with correct `{ adapter: { read } }` config shape |
| `withGroups` | → `withSections` |
| `withScrollbar` import | `'vlist/scroll'` → `'@floor/vlist'` |
| Infinite Scroll example | Fixed adapter params: `{ start, end }` → `{ offset, limit }` (matches `withAsync` API) |
| Key Features bullet | "Group Support — Works with `withGroups`" → "Sections Support — Works with `withSections`" |
| Key Differences (migration) | "Import path changed: `vlist/builder` + `vlist/grid`" → "Everything from `'@floor/vlist'`" |
| Related Documentation | Fixed all 5 links to use relative paths to existing files |

### features/masonry.md — Import paths, stale feature name, stale links

**Before:** 4 code blocks used `'vlist/builder'` + `'vlist/masonry'` + `'vlist/selection'` sub-path imports. Limitations section referenced `withGroups`. Related Documentation linked to non-existent `/docs/builder.md`. Footer said v1.0.0+.

| Change | Detail |
|--------|--------|
| All imports | `'vlist/builder'` + `'vlist/masonry'` etc. → single `'@floor/vlist'` import (4 code blocks) |
| Limitations section | `withGroups({ ... })` → `withSections({ ... })` |
| Limitations heading | "Groups/Sections" → "Sections" |
| Related Documentation | Fixed all 4 links to use relative paths to existing files |
| Footer version | v1.0.0+ → v1.1.0 |

### resources/examples.md — Import paths, stale descriptions

**Before:** Example Scripts section used `'vlist/core'`, `'vlist/builder'` + `'vlist/grid'` + `'vlist (withScrollbar)'`. Core example missing `.build()` call.

| Change | Detail |
|--------|--------|
| Core example | `'vlist/core'` → `'@floor/vlist'`, added `.build()`, heading "Core (Lightweight)" → "Basic Example" |
| Builder example | `'vlist/builder'` + `'vlist/grid'` + `'vlist (withScrollbar)'` → single `'@floor/vlist'`, heading "Builder Pattern with Features" → "With Features" |
| React example | `'vlist/core'` → `'@floor/vlist'` |

### resources/bundle-size.md — Import paths

**Before:** 13 code blocks used bare `from 'vlist'` instead of `from '@floor/vlist'`.

**After:** All 13 replaced with `'@floor/vlist'`. Prose references (`import * from 'vlist'` in Don't list) also updated.

### internals/rendering.md — Import path

Single `from 'vlist'` → `from '@floor/vlist'` in the SizeCache example.

### api/types.md — Stale feature name

Heading `GroupsConfig` with description "Configuration for `withGroups()`" → heading `SectionsConfig (GroupsConfig)` with description "Configuration for `withSections()`. The interface is named `GroupsConfig` in source."

### navigation.json — Missing entry

`features/placeholders` was in `overview.json` but absent from the sidebar. Added between `features/async` and `features/selection` with desc "Skeleton loading states (withAsync)".

### README.md (docs index) — Link table alignment

| Change | Detail |
|--------|--------|
| API Reference table | Removed duplicate "Methods" row (pointed to same file as "Reference"). Added Types, Events, Constants, Exports — now mirrors `navigation.json` exactly. |
| Features table | Added Masonry (+2.9 KB) and Placeholders (Included) rows. Updated Overview description. |
| Internals table | Added Measurement and Scrollbar rows — were in `navigation.json` but missing from README. |

### features/overview.md — Feature compatibility matrix

Added new "Feature Compatibility" section before "See Also" with:
- 9×9 matrix (Grid, Masonry, Sections, Async, Selection, Scale, Scrollbar, Page, Snapshots)
- Legend (✅ fully compatible, ⚠️ works with care, ❌ cannot combine)
- Key constraints summary (Grid↔Masonry, Masonry↔Sections, Page↔Scrollbar, Page↔Scale, etc.)

### Archive — Housekeeping

Moved internal development artifacts out of the served docs tree:

| Source | Destination | Files |
|--------|-------------|-------|
| `issues/` | `archive/issues/` | 6 resolved implementation prompts and bug investigations |
| `analysis/` | `archive/analysis/` | 7 md + 4 svg + 1 json (dependency analysis, SEO, code review) |
| `test/` | `archive/test/` | 4 test completion/coverage summaries |
| `refactoring/` (14 of 17 files) | `archive/refactoring/` | Bundle size comparison, memory optimization, decomposition plans, session notes, checklists, summaries |

**Kept in `refactoring/`:** `documentation.md` (this audit log), `v0.9.0-migration-guide.md`, `height-to-size-refactoring.md` (both linked from README.md).

**Kept in place:** `benchmarks/comparison-audit.md` — benchmarks stay available.

### Not changed (verified correct)

| File | Status |
|------|--------|
| **refactoring/v0.9.0-migration-guide.md** | `from 'vlist'` in Before/After examples is historically accurate (pre-scoped-name era) |
| **refactoring/height-to-size-refactoring.md** | Same — migration doc for v0.8.2→v0.9.0 era |
| **CHANGELOG.md** | No import examples — version history only |
| **getting-started.md** | Already uses `'@floor/vlist'` throughout (fixed in Phase 3) |
| **All archive/** files | Historical — not served, not fixed |

---

## Phase 6 — Framework Adapter Documentation

The biggest remaining gap: four adapter packages mentioned in the Architecture page but with no usage docs. Framework users are the majority audience.

### Adapter Source Audit

Read all four adapter source files (`vlist-react/src/index.ts`, `vlist-vue/src/index.ts`, `vlist-svelte/src/index.ts`, `vlist-solidjs/src/index.ts`), their `package.json` files, and READMEs.

**Key findings:**

| | React | Vue | Svelte | SolidJS |
|---|---|---|---|---|
| **Package** | `vlist-react` (0.1.1) | `vlist-vue` (0.1.1) | `vlist-svelte` (0.1.1) | `vlist-solidjs` (0.1.0) |
| **Main export** | `useVList()` hook | `useVList()` composable | `vlist` action | `createVList()` primitive |
| **Event helper** | `useVListEvent()` | `useVListEvent()` | `onVListEvent()` | `createVListEvent()` |
| **Config input** | Plain object | Plain object or `Ref` | `{ config, onInstance }` | `Accessor<Config>` |

All four share identical internal wiring: read config fields, conditionally chain `.use(withPage())`, `.use(withAsync())`, `.use(withGrid())`, `.use(withSections())`, `.use(withSelection())`, `.use(withScale())`, `.use(withScrollbar())`, `.use(withSnapshots())`. The user never calls `.use()` or `.build()` — the adapter does it. Adapters use a monolithic config shape, not the builder API directly.

**Package name correction:** Adapters are `vlist-react`, `vlist-vue`, `vlist-svelte`, `vlist-solidjs` (unscoped), NOT `@floor/vlist-react` etc. The Architecture page had the wrong scoped names — fixed.

**Type observation:** All adapters import `VListConfig` from `@floor/vlist`, but at the time of this audit, this type did not exist in core — only `BuilderConfig` was exported. The adapters referenced fields like `adapter`, `loading`, `layout`, `grid`, `groups`, `selection`, `scrollbar` that aren't part of `BuilderConfig`. **Fixed in Phase 7** — `VListConfig` now exists in core as an extension of `BuilderConfig` with all adapter convenience fields.

### Structure Decision: Single Page

Chose a single `frameworks.md` page over four separate pages:

- **90% shared content** — config shape, feature wiring, event subscription, cleanup are identical across all four
- **Principle #2 (no duplication)** — four pages would repeat the config/feature/event explanation four times
- **Principle #10 (user journey first)** — framework user needs their framework's code block plus the shared config reference, not a full separate page
- **Principle #1 (flat TOC)** — H2 per framework, H2 for shared sections; every entry reachable from sidebar

### frameworks.md — New file (597 lines)

| Section | Content |
|---------|---------|
| How Adapters Work | What the adapter does (5-step lifecycle), no `.use()`/`.build()` needed |
| React | Install, `useVList` with return table, `useVListEvent`, instance methods |
| Vue | Install, `useVList` with return table, reactive `Ref` config, `useVListEvent`, instance methods |
| Svelte | Install, `vlist` action with options table, `onVListEvent` (manual cleanup), instance methods |
| SolidJS | Install, `createVList` with Accessor convention, `createVListEvent`, instance methods |
| Config Reference | Core fields table, feature fields trigger table, feature config examples |
| TypeScript | Generic typing across frameworks, config type exports table |
| API Summary | Comparison table of all four adapters |
| Design Principles | Mount-based vs virtual-items, config-driven wiring, externalised deps |

Every code example verified against the actual adapter source. Import paths use the correct unscoped package names (`vlist-react`, not `@floor/vlist-react`). Core imports use `@floor/vlist` per Principle #8.

### navigation.json — Added entry

Added `frameworks` to the top-level items group (alongside `getting-started`):

```json
{ "slug": "frameworks", "name": "Framework Adapters", "desc": "React, Vue, Svelte, and SolidJS integration" }
```

### overview.json — Added card

Added a new "Getting Started" card group at the top with both `getting-started` and `frameworks` cards.

### getting-started.md — Added cross-reference

Added "Use React, Vue, Svelte, or SolidJS → Framework Adapters" as the first row in the Next Steps table.

### README.md (docs index) — Added links

- Added link in Quick Start section
- Added "Framework Adapters" subsection with link table
- Added "Use React, Vue, Svelte, or SolidJS" entry in "Find What You Need" section

### resources/roadmap.md — Fixed package names, added link

| Change | Detail |
|--------|--------|
| Package names | `@floor/vlist-react` → `vlist-react`, same for vue/svelte/solidjs |
| Cross-reference | Added "See Framework Adapters for install, usage, event subscription, and config reference per framework" |

### Not changed (verified accurate)

| File | Status |
|------|--------|
| **features/overview.md** | ✅ No adapter references to update |
| **api/events.md** | ✅ Event names and payloads match what adapters use |
| **api/types.md** | ✅ `VListEvents`, `EventHandler`, `Unsubscribe` types match adapter imports |

---

### Phase 6b — Navigation Reorganization

Post-P6 cleanup: section ordering, label rename, item reordering.

#### Internals → Under the Hood

Renamed the "Internals" nav section to **"Under the Hood"** — friendlier, signals "for the curious" without feeling gated. Updated in:

| File | Change |
|------|--------|
| `navigation.json` | `"label": "Internals"` → `"label": "Under the Hood"` |
| `overview.json` | Same label rename |
| `README.md` | `### Internals` → `### Under the Hood`, table header `Internal` → `Topic`, bullet list updated |

In-page uses of "internals" (H2 headings inside feature pages like `## Internals`, link text like "Scrollbar Internals") left unchanged — they describe the concept, not the nav section.

#### Scrollbar → Scroll

The Under the Hood "Scrollbar" entry covers the scroll controller, custom scrollbar, *and* velocity tracking — "Scrollbar" undersold it. Renamed to **"Scroll"** in:

| File | Change |
|------|--------|
| `navigation.json` | `"name": "Scrollbar"` → `"name": "Scroll"` |
| `overview.json` | Same |
| `README.md` | Table link text `Scrollbar` → `Scroll` |
| `internals/scrollbar.md` | Title `# Scrollbar Internals` → `# Scroll Internals`, updated tagline |

File stays `internals/scrollbar.md` — no reason to break links for a rename.

#### Resources moved to last

Swapped Resources and Under the Hood in both `navigation.json` and `overview.json`. Resources (benchmarks, bundle size, testing, architecture) is reference/meta material — belongs at the bottom of the nav, not before the deep-dive section.

**Sidebar order:** Getting Started → API Reference → Features → Under the Hood → Resources

#### Under the Hood items reordered

Reordered from arbitrary to top-down architecture flow:

| # | Before | After | Rationale |
|---|--------|-------|-----------|
| 1 | Structure | **Structure** | What exists — the file map |
| 2 | Rendering | **Context** | How it's wired — BuilderContext |
| 3 | Measurement | **Rendering** | How items reach the DOM |
| 4 | Scrollbar | **Scroll** | How scroll is managed |
| 5 | Context | **Orientation** | How both axes share one path |
| 6 | Orientation | **Measurement** | The auto-size special case (Mode B) |

Updated in `navigation.json`, `overview.json`, and `README.md` table.

---

## Phase 7 — Open Items Cleanup

Four open items from the NEXT_THREAD doc, all resolved in one pass.

### VListConfig type — code fix in core

All four adapter packages import `VListConfig` from `@floor/vlist`, but core only exported `BuilderConfig`. The adapters use convenience fields (`adapter`, `loading`, `layout`, `grid`, `groups`, `selection`, `scrollbar`) that aren't part of `BuilderConfig` — they're the monolithic config shape that adapters translate into `.use(withX())` calls.

**Fix:** Added `VListConfig<T>` interface in `vlist/src/builder/types.ts` that extends `BuilderConfig<T>` (via `Omit<BuilderConfig<T>, 'scroll'>`) with:

| Field | Type | Triggers |
|-------|------|----------|
| `scroll` | Core scroll fields + `scrollbar` sub-field | `withScrollbar()` (via `scroll.scrollbar`) |
| `layout` | `'list' \| 'grid'` | — |
| `grid` | `GridConfig` | `withGrid()` (when `layout = 'grid'`) |
| `adapter` | `VListAdapter<T>` | `withAsync()` |
| `loading` | `{ cancelThreshold, preloadThreshold, preloadAhead }` | Passed to `withAsync()` |
| `groups` | `GroupsConfig` | `withSections()` |
| `selection` | `SelectionConfig` | `withSelection()` |
| `scrollbar` | `'native' \| 'none' \| ScrollbarOptions` | `withScrollbar()` (top-level shorthand) |

The `scroll` property uses `Omit` + intersection to add the `scrollbar` sub-field that `BuilderConfig.scroll` doesn't have (since the builder uses `withScrollbar()` directly).

Exported from `vlist/src/builder/index.ts` and `vlist/src/index.ts`. Rebuilt with `--types`. All four adapters now compile clean (`tsc --noEmit` passes). Core tests: 2268 pass, 0 fail.

### Adapter README sync

All four adapter READMEs (`vlist-react`, `vlist-vue`, `vlist-svelte`, `vlist-solidjs`) rewritten to a consistent format:

| Section | Content |
|---------|---------|
| Title + intro | One-line description linking to `@floor/vlist` |
| Install | `npm install @floor/vlist <adapter>` |
| Quick Start | Minimal working example with `@floor/vlist/styles` import |
| API | Bullet list of exports + one-line description each |
| Config note | Links to API reference, explains feature fields are auto-wired |
| Documentation | Links to `frameworks.md#<framework>` anchor |

**Specific fixes:**
- SolidJS: install order was `vlist-solidjs @floor/vlist` → `@floor/vlist vlist-solidjs`
- SolidJS: added missing `import '@floor/vlist/styles'` and container height
- All: added `@floor/vlist/styles` import where missing
- All: link text points to `vlist.dev/docs/frameworks#<framework>` instead of generic `vlist.dev`

### Tutorials audit

All referenced tutorials exist: `quick-start`, `chat-interface`, `builder-pattern`, `optimization`, `styling`, `accessibility`, `mobile`.

**Stale type name fixed in two files:**

| File | Line | Before | After |
|------|------|--------|-------|
| `tutorials/chat-interface.md` | 192 | `interface VListConfig` | `interface BuilderConfig` |
| `tutorials/optimization.md` | 40 | `VListConfig` | `BuilderConfig` |
| `tutorials/optimization.md` | 194 | `VListConfig` | `BuilderConfig` |

### Examples cross-links

**Fixed broken links:**

| File | Before | After |
|------|--------|-------|
| `features/grid.md` | 4 links, 3 non-existent (`grid/products`, `grid/icons`, `grid/masonry`) | 2 links to actual examples (`photo-album`, `grid/file-browser`) |
| `features/masonry.md` | 4 links, all non-existent (`masonry/pinterest`, `masonry/products`, `masonry/feed`, `masonry/photos`) | 1 link to actual example (`masonry/photo-album`) |

**Added Live Examples sections (new):**

| File | Example Link | Description |
|------|-------------|-------------|
| `features/async.md` | `/examples/data/velocity-loading` | Smart loading that skips during fast scrolling |
| `features/scale.md` | `/examples/data/large-list` | 100K–5M items with withScale (4 frameworks) |
| `features/sections.md` | `/examples/groups/sticky-headers` | A–Z contact list with sticky section headers |
| `features/selection.md` | `/examples/controls` | Full API exploration with selection (4 frameworks) |
| `features/scrollbar.md` | `/examples/photo-album`, `/examples/controls`, `/examples/data/large-list` | Three examples showcasing scrollbar in different contexts |

**Already correct (no change needed):**
- `features/page.md` — links to `/examples/window-scroll/` ✅
- `features/snapshots.md` — links to `/examples/scroll-restore/` ✅

---

## Principles Applied

1. **Flat TOC** — H2 for major sections, H3 for items within. Every entry reachable from the "On this page" sidebar.
2. **No duplication** — Features documented once in `features/*.md`, referenced by link elsewhere.
3. **Source is truth** — Every type, method, constant, and event verified against `vlist/src/`.
4. **Axis-neutral vocabulary** — "size" instead of "height" everywhere in descriptions: item sizes, thumb sizes, element sizes, content sizes. Property names stay `height`/`width` (that's the API), but all prose uses "size" to reinforce the dimension-agnostic `SizeCache`. Watch for sneaky ones like "thumb height" in scrollbar options or "element height" in scale docs.
5. **Behavior over use case** — Describe what `reverse` *does*, not what it's *for*. List use cases as examples, don't prescribe one.
6. **Focused pages** — Reference covers config + properties + methods. Events, types, constants, exports each get their own page.
7. **No backticks in headings** — `marked` passes heading text as raw markdown, so backticks survive as literal characters in the TOC. Use plain text for all H2/H3/H4 headings; code formatting belongs in the body text, not the heading.
8. **Correct package name** — All import examples use `'@floor/vlist'` (the npm scoped name), not `'vlist'`. Sub-path imports only for `'@floor/vlist/styles'` and `'@floor/vlist/styles/extras'` — no `'vlist/async'`, `'vlist/snapshots'`, etc.
9. **Builder API everywhere** — All user-facing examples use `vlist({...}).use(withX()).build()`. No monolithic config with top-level `adapter`, `selection`, `layout`. Old API shown only in clearly labeled migration sections.
10. **User journey first** — Feature docs lead with `withX()` builder config, instance methods, and events. Low-level pure functions and `create*` factories go in an Internals section at the bottom, clearly labeled as advanced/feature-authoring APIs.
11. **No stale resource pages** — Historical documents (completed roadmaps, resolved known issues) are archived, not served. Resource pages reflect the current state of the library.