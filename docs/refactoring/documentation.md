# Documentation Refactoring — v1.0 Audit

> Systematic audit and rewrite of vlist documentation against source code after reaching v1.0.0.

---

## Motivation

After the v1.0.0 release, the docs had drifted significantly from the source. The API reference documented methods that didn't exist (`scrollToItem`, `update`), described features incorrectly (`withPage` was described as wizard navigation instead of window scrolling), used wrong constant values, and had a monolithic 1,159-line reference page where most content was unreachable from the TOC.

---

## What Was Done

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

## What Remains

### Low priority

| File | What | Why |
|------|------|-----|
| **internals/structure.md** | Update version | Says "v0.8+", last updated "January 2026" |

| **resources/roadmap.md** | Update status | Still says version "0.9.5" and "ready for 1.0" — library is at 1.1.0 |
| **resources/known-issues.md** | Stale code examples | Uses pre-builder API syntax (`layout: 'grid'`, `groups` at top level). All items ✅ — historical document, low user impact |
| **resources/testing.md** | Update counts | Test counts likely outdated for v1.0+ |
| **features/*.md (various)** | "Chat UI" labeling | Multiple files use "Chat UI" as the sole use case for reverse mode. Should broaden to behavior-focused descriptions. Only fixed in `reference.md` so far. |

### Not needed

| File | Why |
|------|-----|
| **internals/measurement.md** | Accurate — describes Mode B architecture correctly |
| **internals/orientation.md** | Accurate — describes axis-neutral SizeCache correctly |
| **features/grid.md** | Accurate — already documents GridHeightContext inline |
| **features/masonry.md** | Accurate — matches source |
| **features/page.md** | Accurate (after our fix) |
| **features/snapshots.md** | Accurate — documents `SnapshotConfig.restore` correctly |
| **resources/bundle-size.md** | Accurate — sizes and tree-shaking info still valid |
| **resources/benchmarks.md** | Accurate — benchmark methodology unchanged |

---

## Principles Applied

1. **Flat TOC** — H2 for major sections, H3 for items within. Every entry reachable from the "On this page" sidebar.
2. **No duplication** — Features documented once in `features/*.md`, referenced by link elsewhere.
3. **Source is truth** — Every type, method, constant, and event verified against `vlist/src/`.
4. **Axis-neutral vocabulary** — "size" instead of "height" everywhere in descriptions: item sizes, thumb sizes, element sizes, content sizes. Property names stay `height`/`width` (that's the API), but all prose uses "size" to reinforce the dimension-agnostic `SizeCache`. Watch for sneaky ones like "thumb height" in scrollbar options or "element height" in scale docs.
5. **Behavior over use case** — Describe what `reverse` *does*, not what it's *for*. List use cases as examples, don't prescribe one.
6. **Focused pages** — Reference covers config + properties + methods. Events, types, constants, exports each get their own page.
7. **No backticks in headings** — `marked` passes heading text as raw markdown, so backticks survive as literal characters in the TOC. Use plain text for all H2/H3/H4 headings; code formatting belongs in the body text, not the heading.