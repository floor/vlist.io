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

---

## What Remains

### High priority

| File | What | Why |
|------|------|-----|
| **api/types.md** | Full rewrite | Documents stale pre-builder `VListConfig` with `adapter`, `selection`, `scrollElement` as top-level props. `VList` interface lists `scrollToItem` and shows all feature methods as always-available. Missing `estimatedHeight`/`estimatedWidth` on `ItemConfig`. |
| **api/constants.md** | Fix values | `VELOCITY_SAMPLE_COUNT` says 8 (actual: 5), `MIN_RELIABLE_SAMPLES` says 3 (actual: 2), `DEFAULT_MASK_CHARACTER` says '█' (actual: 'x'), references non-existent constant names (`DEFAULT_CANCEL_THRESHOLD` etc.) |
| **api/events.md** | Add missing events | Missing `item:dblclick`, `velocity:change`, `resize` detailed documentation |

### Medium priority

| File | What | Why |
|------|------|-----|
| **internals/context.md** | Major rewrite | Describes a `createContext()` function and `VListContext` interface that don't exist. References `vlist.ts`, `handlers.ts`, `methods.ts`, `animation.ts` — all refactored into `builder/core.ts`. |
| **internals/rendering.md** | Fix references | References `heights.ts` (actual: `sizes.ts`), `createHeightCache` (actual: `createSizeCache`), `calculateTotalHeight` (actual: `calculateTotalSize`). `ViewportState` uses `scrollTop`/`containerHeight` (actual: `scrollPosition`/`containerSize`). `createRenderer` signature is stale. |
| **internals/structure.md** | Update version | Says "v0.8+", last updated "January 2026" |

### Low priority

| File | What | Why |
|------|------|-----|
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