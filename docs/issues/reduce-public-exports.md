# Issue: Reduce Public Exports — Internal Symbols Leak Through Entry Point

> The top-level `vlist` entry point re-exports ~50 internal symbols
> alongside the ~15 that users actually need. This clutters IDE autocomplete,
> inflates the perceived API surface, and implies stability guarantees on
> implementation details.

**Status:** ✅ Resolved
**Priority:** Medium
**Affects:** `vlist/src/index.ts`
**Discovered via:** Bundlephobia Exports Analysis for `vlist@1.3.3`
**Resolved:** 2026-03-08

---

## Problem

The main `index.ts` re-exports everything from internal modules. As a result,
`import { } from 'vlist'` exposes symbols like:

| Category | Examples | Count |
|---|---|---|
| `create*` | `createSizeCache`, `createEmitter`, `createScrollController`, `createMasonryRenderer`, `createAsyncManager`, `createTableRenderer`, `createGridLayout`, `createSparseStorage`, `createPlaceholderManager`, `createMeasuredSizeCache`, `createSelectionState`, `createGroupLayout`, `createStickyHeader`, `createScrollbar`, `createTableLayout`, `createTableHeader`, `createGridRenderer`, `createStats` | ~18 |
| `calculate*` | `calculateScrollToIndex`, `calculateTotalSize`, `calculateActualSize`, `calculateItemOffset`, `calculateScaledItemPosition`, `calculateScaledVisibleRange`, `calculateScaledScrollToIndex`, `calculateRenderRange`, `calculateScaledRenderRange`, `calculateIndexFromScrollPosition`, `calculateMissingRanges` | ~11 |
| `is*` / `get*` | `isPlaceholderItem`, `isInRange`, `isSelected`, `isGroupHeader`, `getSelectedIds`, `getSelectedItems`, `getScale`, `getScaleState`, `getScaleInfo`, `getRangeCount`, `getMaxItemsWithoutScaling` | ~11 |
| Utilities | `rafThrottle`, `mergeRanges`, `diffRanges`, `rangesEqual`, `simpleVisibleRange`, `filterPlaceholders`, `buildLayoutItems`, `clampScrollPosition` | ~8 |
| Selection | `selectItems`, `deselectItems`, `selectAll`, `clearSelection`, `toggleSelection` | ~5 |
| Constants | `MAX_VIRTUAL_SIZE`, `needsScaling` | ~2 |

These are **internal implementation details** used by features and the rendering
pipeline. End users should never import them directly.

### What Users Actually Need

The intended public API is small:

```typescript
// Factory
vlist

// Features
withAsync, withGrid, withMasonry, withGroups, withSelection,
withScale, withScrollbar, withTable, withPage, withSnapshots

// Types (zero runtime cost)
VList, VListItem, BuilderConfig, ItemConfig, ItemTemplate, ItemState,
ScrollConfig, ScrollToOptions, ScrollSnapshot, VListEvents, ...
```

---

## Impact

### Developer Experience

- **IDE autocomplete shows 60+ symbols** instead of ~15 — users must mentally
  filter internals from the public API
- **Documentation confusion** — symbols like `createSizeCache` or
  `calculateScrollToIndex` appear importable, suggesting they're stable API
- **Accidental coupling** — if users import internals, refactoring becomes a
  breaking change

### Bundlephobia Perception

Bundlephobia's Exports Analysis for v1.3.3 lists every exported symbol with its
individual gzip cost (2.4–10.3 KB each). This makes the package look far more
complex than it is and obscures the clean `vlist` + `with*` architecture.

### No Bundle Size Impact

Tree-shaking already handles this correctly — unused exports are dropped. This
is purely an API surface and DX issue, not a size problem.

---

## Proposed Solution

### 1. Restrict Top-Level Exports

Only export the public API from `src/index.ts`:

```typescript
// src/index.ts

// Factory
export { vlist } from './builder/core'

// Features
export { withAsync } from './features/async'
export { withGrid } from './features/grid'
export { withMasonry } from './features/masonry'
export { withGroups } from './features/groups'
export { withSelection } from './features/selection'
export { withScale } from './features/scale'
export { withScrollbar } from './features/scrollbar'
export { withTable } from './features/table'
export { withPage } from './features/page'
export { withSnapshots } from './features/snapshots'

// Types (re-export all — zero runtime cost)
export type { ... } from './types'
export type { ... } from './builder/types'
```

### 2. Preserve Deep Imports for Advanced Users

Feature authors and power users can still reach internals via deep paths:

```typescript
// Advanced: import internals explicitly
import { createSizeCache } from 'vlist/rendering/sizes'
import { calculateScrollToIndex } from 'vlist/rendering/viewport'
```

This requires adding `exports` entries in `package.json` for the subpaths we
want to support. Only add entries for modules that are genuinely useful to
feature authors — not every internal file.

### 3. Consider a Separate `vlist/internals` Entry Point

As an alternative to many deep paths, a single `vlist/internals` entry
point could re-export everything feature authors need:

```typescript
import { createSizeCache, calculateScrollToIndex } from 'vlist/internals'
```

This makes the boundary explicit: `vlist` = stable API,
`vlist/internals` = use at your own risk.

---

## Steps

1. ~~Audit `src/index.ts` — catalog every export and classify as public or internal~~
2. ~~Identify which internals are needed by the framework adapters (vlist-react,
   vlist-vue, vlist-svelte, vlist-solidjs) — those must remain importable~~
3. ~~Restrict `src/index.ts` to the public API only~~
4. ~~Add `package.json` `exports` entries for supported deep paths or an
   `internals` entry point~~
5. ~~Update the framework adapters if their imports change~~
6. Verify bundlephobia Exports Analysis shows only the clean public API
7. ~~Update `docs/api/exports.md` to document the new import structure~~

---

## Resolution

Implemented Option 3 from the proposal: a single `vlist/internals` entry
point.

### What changed

| File | Change |
|------|--------|
| `src/index.ts` | Stripped to 11 runtime exports: `vlist` + 10 `with*` features + types |
| `src/internals.ts` | New file — all 57 low-level runtime exports (create*, calculate*, selection, etc.) |
| `build.ts` | Builds both `dist/index.js` and `dist/internals.js` as separate ESM bundles |
| `package.json` | Added `"./internals"` to `exports` map and `dist/internals.js` to `files` |
| `docs/api/exports.md` | All import paths updated to `vlist/internals` with migration note |

### Verification

- **Typecheck:** clean (`tsc --noEmit` passes)
- **Tests:** 2781 pass, 0 fail
- **Build:** both bundles generate with `.d.ts` declarations
- **Framework adapters:** zero changes needed — all four (react, vue, svelte,
  solidjs) only import from `vlist` (public API)

### Import paths after this change

```typescript
// Public API — stable, clean autocomplete
import { vlist, withGrid, withSelection } from 'vlist'
import type { VList, VListItem } from 'vlist'

// Internals — advanced, use at your own risk
import { createSizeCache, calculateScrollToIndex } from 'vlist/internals'
```

---

## Risks

- **Breaking change for users importing internals** — unlikely to be many, but
  worth a semver minor or a deprecation period
- ~~**Framework adapter breakage** — adapters use some internals; must update them
  in the same release~~ → Confirmed: no adapter imports any internal symbol
- ~~**Deep path maintenance** — each `exports` entry is a public contract; keep
  the set small~~ → Solved by using a single `internals` entry point

---

## References

- Bundlephobia analysis: https://bundlephobia.com/package/vlist@1.3.3
- Node.js `exports` field: https://nodejs.org/api/packages.html#exports
- Related: `docs/api/exports.md` (current exports documentation)

---

*Created: 2026-03-08*
*Resolved: 2026-03-08*