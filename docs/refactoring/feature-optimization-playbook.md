# Feature Optimization Playbook

**Origin:** Masonry feature optimization (February 2026)
**Purpose:** Reusable techniques to apply across all vlist features (grid, selection, scale, sections, etc.)
**Measured on:** masonry feature — 7,465 → 6,502 bytes minified (−12.9%), 3,188 → 2,963 bytes gzipped (−7.1%)
**Also applied to:** grid feature ✅, core renderer (`rendering/renderer.ts`) ✅, sections feature (sticky header + DRY) ✅

---

## Table of Contents

1. [Flatten Nested Interfaces](#1-flatten-nested-interfaces)
2. [Remove Dead Methods](#2-remove-dead-methods)
3. [DRY Data Manager Interception](#3-dry-data-manager-interception)
4. [Early Exit on Unchanged Scroll](#4-early-exit-on-unchanged-scroll)
5. [Pool Hot-Path Arrays](#5-pool-hot-path-arrays)
6. [Reuse Sets Across Frames](#6-reuse-sets-across-frames)
7. [Cache Closures and Derived Values](#7-cache-closures-and-derived-values)
8. [Mutate State In Place](#8-mutate-state-in-place)
9. [DocumentFragment Batch Insertion](#9-documentfragment-batch-insertion)
10. [Release Grace Period](#10-release-grace-period)
11. [Change Tracking on Rendered Items](#11-change-tracking-on-rendered-items)
12. [Binary Search for Visibility](#12-binary-search-for-visibility)
13. [Checklist](#13-checklist)
14. [Known Limitations & Future Work](#known-limitations--future-work)
15. [Applied Changes Log](#applied-changes-log)

---

## 1. Flatten Nested Interfaces

### Problem

Nested objects in hot-path data structures create extra allocations and deeper property access chains. Every `.position.y` in a loop is an extra pointer dereference, and every `{ position: { x, y, lane } }` is an extra object on the heap.

### Before

```typescript
interface ItemPlacement {
  index: number;
  position: {
    x: number;
    y: number;
    lane: number;
  };
  size: number;
  crossSize: number;
}

// In layout loop (10K iterations):
placements[i] = {
  index: i,
  position: { x: laneOffsets[lane]!, y: mainOffset, lane },
  size: itemSize,
  crossSize: crossAxisSize,
};

// In hot path:
if (p.position.y + p.size <= mainAxisStart) { ... }
```

### After

```typescript
interface ItemPlacement {
  index: number;
  x: number;
  y: number;
  lane: number;
  size: number;
  crossSize: number;
}

// In layout loop — one fewer object per item:
placements[i] = {
  index: i,
  x: laneOffsets[lane]!,
  y: mainOffset,
  lane,
  size: itemSize,
  crossSize: crossAxisSize,
};

// In hot path — shorter access:
if (p.y + p.size <= mainAxisStart) { ... }
```

### Impact

- **10K items → 10K fewer objects** allocated during layout
- Shorter property paths minify better (`.y` vs `.position.y`)
- In the masonry bundle: eliminated 15 `.position.` access chains

### Where to Apply

- Any data structure created per-item in a loop (placements, row metadata, cell info)
- Grid feature: row/cell position objects (already flat ✅)
- Sections feature: group header metadata
- Any `{ position: { ... } }` or `{ range: { start, end } }` pattern on hot-path data

### Rule of Thumb

> If a nested object is created inside a loop OR accessed inside a per-frame function, flatten it.

---

## 2. Remove Dead Methods

### Problem

Methods defined on a renderer or layout interface that are never called from the feature or externally still ship in the bundle. Esbuild cannot tree-shake methods off a returned object literal.

### Before

```typescript
// renderer.ts — returned from factory
return {
  render,
  updateItem,        // ← never called from feature.ts
  updateItemClasses, // ← never called from feature.ts
  getElement,
  clear,
  destroy,
};
```

### How to Detect

```bash
# Search for actual call sites (not declarations)
grep -rn "masonryRenderer\.\(updateItem\|updateItemClasses\)" src/features/masonry/
# If no results → dead code
```

### After

```typescript
return {
  render,
  getElement,  // kept — lightweight (Map.get) and useful externally
  clear,
  destroy,
};
```

### Impact

- Masonry: removed `updateItem` (~20 lines) and `updateItemClasses` (~12 lines) → **−963 bytes minified**
- Also removed `getCrossAxisSize` / `getCrossAxisOffset` from layout public API (used only internally as cached variables)

### Where to Apply

- Every renderer: check which methods are called from the feature's `setup()`
- Every layout: check which getters are read by the feature vs. exposed "just in case"
- Masonry renderer ✅ (removed `updateItem`, `updateItemClasses`)
- Grid renderer ✅ (retained `updateItem`/`updateItemClasses` with change tracking — needed by selection feature, but now skip work when state unchanged)
- Sections renderer — audit all returned objects

### Rule of Thumb

> If `grep` finds zero call sites for a returned method outside its own file, remove it from the return object. Re-add later if a consumer needs it.

---

## 3. DRY Data Manager Interception

### Problem

Features that need to react to data changes (layout recalculation, re-render) intercept data manager methods. The pattern is identical for each method but was copy-pasted 5 times.

### Before

```typescript
if (typeof dm.setItems === "function") {
  const original = dm.setItems.bind(dm);
  dm.setItems = (items: T[]) => { original(items); handleDataChange(); };
}
if (typeof (dm as any).appendItems === "function") {
  const original = (dm as any).appendItems.bind(dm);
  (dm as any).appendItems = (items: T[]) => { original(items); handleDataChange(); };
}
if (typeof (dm as any).prependItems === "function") {
  const original = (dm as any).prependItems.bind(dm);
  (dm as any).prependItems = (items: T[]) => { original(items); handleDataChange(); };
}
// ... repeated for updateItem, removeItem
```

### After

```typescript
const dm = ctx.dataManager as any;
const intercept = (method: string): void => {
  if (typeof dm[method] !== "function") return;
  const original = dm[method].bind(dm);
  dm[method] = (...args: any[]) => { original(...args); handleDataChange(); };
};
intercept("setItems");
intercept("appendItems");
intercept("prependItems");
intercept("updateItem");
intercept("removeItem");
```

### Impact

- ~40 lines → ~10 lines
- Minifies significantly smaller (one function body vs five)
- Easier to maintain — add new methods in one place

### Where to Apply

- Any feature that overrides data manager methods: masonry, grid, sections
- Any future feature that needs data-change hooks
- Sections feature: scroll helpers (resolveScrollArgs, createSmoothScroll) consolidated into `builder/scroll.ts` ✅

---

## 4. Early Exit on Unchanged Scroll

### Problem

The scroll handler (`onScrollFrame`) calls `renderIfNeeded` on every scroll event. But if the scroll position hasn't actually changed (duplicate events, sub-pixel rounding), all downstream work runs for nothing — binary search, renderer diffing, viewport state updates.

### Implementation

```typescript
let lastScrollPosition = -1;
let lastContainerSize = -1;
let forceNextRender = true; // first render must always run

const renderIfNeeded = (): void => {
  if (ctx.state.isDestroyed) return;

  const scrollPosition = ctx.scrollController.getScrollTop();
  const containerSize = ctx.state.viewportState.containerSize;

  // Skip all work when nothing changed
  if (
    !forceNextRender &&
    scrollPosition === lastScrollPosition &&
    containerSize === lastContainerSize
  ) {
    return;
  }
  lastScrollPosition = scrollPosition;
  lastContainerSize = containerSize;
  forceNextRender = false;

  // ... actual render logic
};

const forceRender = (): void => {
  forceNextRender = true;
  renderIfNeeded();
};
```

### Critical Detail

`forceNextRender` must be set to `true` by:
- `forceRender()` (explicit re-render)
- Data change handlers (items changed, layout recalculated)
- Resize handlers (container size changed)

### Impact

- **Zero work** on duplicate scroll events (common in browsers)
- On a steady-state scroll frame where position hasn't changed: no binary search, no renderer diffing, no viewport state updates

### Where to Apply

- Every feature that replaces render functions via `setRenderFns()`
- Masonry feature ✅
- Grid feature ✅
- Sections feature — any custom `renderIfNeeded`

---

## 5. Pool Hot-Path Arrays

### Problem

Functions called on every scroll frame that return arrays (`getVisibleItems`, `getVisibleRange`) allocate a new array each time. At 60fps, that's 60 arrays/second for GC to collect.

### Implementation

```typescript
// Module-level pooled array
let visiblePool: ItemPlacement[] = [];

const getVisibleItems = (
  placements: ItemPlacement[],
  mainAxisStart: number,
  mainAxisEnd: number,
): ItemPlacement[] => {
  // Reset length — no allocation, reuses existing backing storage
  visiblePool.length = 0;

  for (let c = 0; c < columns; c++) {
    // ... binary search + collect into visiblePool
    visiblePool.push(p);
  }

  return visiblePool;
};
```

### Contract

**Single-consumer:** The caller must finish reading the returned array before calling the function again. Document this:

```typescript
// Single-consumer contract: caller must finish reading before the next call.
```

This is always safe in our architecture — the feature calls `getVisibleItems`, passes the result to the renderer synchronously, then the next scroll frame calls again.

### Impact

- Zero array allocation per scroll frame (steady-state)
- Backing storage grows to max visible count and stays there

### Where to Apply

- `getVisibleItems` in any layout (masonry, grid, sections)
- `getItemsForRange` if called per-frame
- Any function that returns a per-frame result array

---

## 6. Reuse Sets Across Frames

### Problem

The renderer builds a `Set<number>` of visible indices for O(1) release decisions. Creating `new Set()` every frame generates garbage.

### Implementation

```typescript
// Created once at renderer setup
const visibleSet = new Set<number>();

const render = (getItem, placements, selectedIds, focusedIndex) => {
  // Clear and repopulate — no allocation
  visibleSet.clear();
  for (let i = 0; i < placements.length; i++) {
    visibleSet.add(placements[i]!.index);
  }

  // O(1) release decisions
  for (const [index, tracked] of rendered) {
    if (!visibleSet.has(index)) { ... }
  }
};
```

### Also Applies To

Module-level shared constants for common empty values:

```typescript
// Shared across all instances — avoids allocation when no selection feature
const EMPTY_ID_SET: Set<string | number> = new Set();

// In render:
const selectedIds = selectedIdsGetter ? selectedIdsGetter() : EMPTY_ID_SET;
```

### Where to Apply

- Every renderer's `render()` function
- Any per-frame Set/Map construction
- Empty-collection fallbacks (empty Set, empty array)
- Masonry feature ✅ (module-level `EMPTY_ID_SET`, renderer `visibleSet`)
- Grid feature ✅ (module-level `EMPTY_ID_SET`)

---

## 7. Cache Closures and Derived Values

### Problem

Closures created inside per-frame functions are allocated every frame. Constants derived from config are re-computed every frame.

### Before (per frame)

```typescript
const renderIfNeeded = (): void => {
  const overscan = resolvedConfig.overscan ?? 3;
  const mainAxisStart = Math.max(0, scrollPosition - overscan * 100);

  renderer.render(
    (index: number) => ctx.dataManager.getItem(index),  // new closure every frame!
    ...
  );
};
```

### After (cached at setup)

```typescript
// Computed once at setup
const overscanPx = (resolvedConfig.overscan ?? 3) * 100;
const getItem = (index: number) => ctx.dataManager.getItem(index) as T | undefined;

const renderIfNeeded = (): void => {
  const mainAxisStart = Math.max(0, scrollPosition - overscanPx);
  renderer.render(getItem, ...);  // same closure reference every frame
};
```

### Also Applies To

Caching method references resolved from `ctx.methods.get()`:

```typescript
// Resolved once (not per frame via Map.get)
let selectedIdsGetter: (() => Set<string | number>) | null = null;
let selectionMethodsResolved = false;

const resolveSelectionMethods = (): void => {
  if (selectionMethodsResolved) return;
  selectionMethodsResolved = true;
  selectedIdsGetter = ctx.methods.get("_getSelectedIds") ?? null;
};
```

### Where to Apply

- Any `ctx.methods.get()` call inside a render function
- Any `(...) => { ... }` lambda passed to a renderer per frame
- Any `config.value ?? default` computed per frame
- Masonry feature ✅ (cached `overscanPx`, `getItem`, selection method refs)
- Grid feature ✅ (cached `overscan`, selection method refs)
- Builder core ✅ (cached selection method refs via `resolveSelectionGetters`)

---

## 8. Mutate State In Place

### Problem

Creating new objects to update viewport state generates garbage every frame.

### Before

```typescript
ctx.state.viewportState.visibleRange = {
  start: firstIndex,
  end: lastIndex,
};
ctx.state.viewportState.renderRange = ctx.state.viewportState.visibleRange;
ctx.state.lastRenderRange = { start: firstIndex, end: lastIndex };
```

### After

```typescript
const viewportState = ctx.state.viewportState;
viewportState.visibleRange.start = firstIndex;
viewportState.visibleRange.end = lastIndex;
viewportState.renderRange.start = firstIndex;
viewportState.renderRange.end = lastIndex;

const lastRange = ctx.state.lastRenderRange;
lastRange.start = firstIndex;
lastRange.end = lastIndex;
```

### Impact

- 3 object allocations → 0 per frame
- Slightly more code, but explicit about mutation

### Where to Apply

- `viewportState.visibleRange` updates in every feature
- `viewportState.renderRange` updates
- `lastRenderRange` updates
- Any `{ start, end }` range that's updated per frame
- Masonry feature ✅
- Grid feature ✅ (also reuses `visibleRange` and `renderRange` objects across frames)

---

## 9. DocumentFragment Batch Insertion

### Problem

Appending elements one-by-one to the DOM causes a reflow per insertion. When many items enter the viewport at once (fast scroll, initial render), this compounds.

### Implementation

```typescript
let fragment: DocumentFragment | null = null;

for (const placement of placements) {
  // ... existing items: update in place
  // New items:
  const tracked = renderItem(...);
  if (!fragment) fragment = document.createDocumentFragment();
  fragment.appendChild(tracked.element);
  rendered.set(itemIndex, tracked);
}

// Single DOM insertion for all new elements
if (fragment) {
  itemsContainer.appendChild(fragment);
}
```

### Impact

- One reflow instead of N reflows when N items enter the viewport
- Matches the pattern already used by core renderer and grid renderer
- Fragment is only created when new items exist (null check avoids allocation on steady scroll)

### Where to Apply

- Every renderer that appends elements to `itemsContainer`
- Masonry renderer ✅
- Grid renderer ✅ (lazy `fragment` creation with null check)
- Core renderer ✅ (lazy `fragment` creation — zero allocation on scroll-only frames)
- Builder core inlined renderer (still uses eager allocation — see Known Limitations)

---

## 10. Release Grace Period

### Problem

Items at the overscan boundary get recycled (DOM element destroyed → new one created from pool) on small scroll deltas. This causes:
- **Hover state loss** — `:hover` CSS is tied to the DOM element; new element doesn't have it
- **CSS transition replays** — Transitions like `transform: scale(1.05)` replay when a fresh element gets `:hover`
- **Unnecessary pool churn** — Element released then immediately re-acquired

### Root Cause

The overscan boundary is the same for both acquiring and releasing items. Items that oscillate near this boundary thrash between rendered and pooled states.

### Implementation

```typescript
const RELEASE_GRACE = 2;  // frames

interface TrackedItem {
  element: HTMLElement;
  // ... other tracking fields
  lastSeenFrame: number;
}

let frameCounter = 0;

const render = (...) => {
  frameCounter++;

  for (const [index, tracked] of rendered) {
    if (visibleSet.has(index)) {
      tracked.lastSeenFrame = frameCounter;      // still visible — update
    } else if (frameCounter - tracked.lastSeenFrame > RELEASE_GRACE) {
      pool.release(tracked.element);              // grace expired — release
      rendered.delete(index);
    }
    // else: in grace period — keep alive, do nothing
  }
};
```

### How It Works

1. Item leaves the visible set → enters grace period (element stays in DOM)
2. For `RELEASE_GRACE` frames, element is retained untouched
3. If item re-enters visible set → same element, `:hover` intact, no transition replay
4. If item stays gone for > `RELEASE_GRACE` frames → released to pool normally

### Testing

Tests that expect immediate release need a `flushGrace` helper:

```typescript
// Masonry: call renderer.render() directly (bypasses feature early-exit)
const flushGrace = (renderer, getItem, placements, times = 3) => {
  for (let i = 0; i < times; i++) {
    renderer.render(getItem, placements, new Set(), -1);
  }
};

// Grid: same pattern but with range-based API
const flushGrace = (renderer, items, range, times = 3) => {
  for (let i = 0; i < times; i++) {
    renderer.render(items, range, new Set(), -1);
  }
};

// Usage: release old items, then assert
flushGrace(renderer, toGetItem(items), newPlacements);
expect(container.children.length).toBe(3);
```

**Integration tests** (full builder, not direct renderer access) must scroll to
slightly different positions to advance the frame counter past the grace window,
because the feature's early-exit guard skips identical scroll positions:

```typescript
// Nudge by 1px per event so each dispatch triggers a full render cycle
simulateScroll(list, 2000);
simulateScroll(list, 2001);
simulateScroll(list, 2002);
simulateScroll(list, 2003); // 4 renders → RELEASE_GRACE(2) fully expired
```

### Impact

- Eliminates hover blink on scroll
- Eliminates CSS transition replays at boundaries
- Reduces pool churn on small scroll oscillations
- Cost: ~4-8 extra DOM elements retained temporarily (negligible)

### Where to Apply

- Every renderer that uses element pooling with absolute positioning
- Masonry renderer ✅
- Grid renderer ✅ (grace loop runs inside `render()` on every call — see Grid-Specific Note below)
- Core renderer ✅ (`TrackedItem` with `lastSeenFrame`, `RELEASE_GRACE = 2`)
- Builder core inlined renderer (still uses immediate release — see Known Limitations)

#### Grid-Specific Note: `tick()` Removed

Grid previously had a range-comparison shortcut that skipped `render()` when
the row-level range was unchanged, requiring a separate `tick()` method to
advance the grace-period clock. This has been removed — grid now always calls
`render()`, matching masonry's approach. The renderer's change tracking makes
unchanged items a no-op (skips template, class, and position updates), so the
extra `render()` call on unchanged-range frames is near-free. The cost of
`getItemRange()` + `getItemsInRange()` on those frames is negligible (O(1)
for grids without groups).

See **Known Limitations — `tick()` divergence ✅ (Fixed)** for details.

---

## 11. Change Tracking on Rendered Items

### Problem

On a steady scroll, most visible items haven't changed — same data, same selection state, same position. But the renderer re-evaluates the template and re-applies position styles on every frame for every visible item.

### Implementation

Track the last-rendered state on each item:

```typescript
interface TrackedItem {
  element: HTMLElement;
  lastItemId: string | number;    // detect data swaps
  lastSelected: boolean;           // detect selection changes
  lastFocused: boolean;            // detect focus changes
  lastY: number;                   // detect position changes
  lastX: number;
  lastSeenFrame: number;           // for grace period
}
```

In the render loop:

```typescript
const existing = rendered.get(itemIndex);
if (existing) {
  const idChanged = existing.lastItemId !== item.id;
  const selectedChanged = existing.lastSelected !== isSelected;
  const focusedChanged = existing.lastFocused !== isFocused;
  const posChanged = existing.lastY !== placement.y || existing.lastX !== placement.x;

  // Template + classes only when state changed
  if (idChanged || selectedChanged || focusedChanged) {
    applyTemplate(existing.element, template(item, itemIndex, state));
    applyClasses(existing.element, isSelected, isFocused);
    existing.lastItemId = item.id;
    existing.lastSelected = isSelected;
    existing.lastFocused = isFocused;
  }

  // Position only when coordinates changed
  if (posChanged) {
    positionElement(existing.element, placement);
    existing.lastY = placement.y;
    existing.lastX = placement.x;
  }
}
```

### Impact

- **Scroll-only frames:** zero template evaluations, zero DOM writes for stable items
- Template evaluation is the most expensive operation (innerHTML or replaceChildren) — skipping it is the biggest single win
- Position updates are cheap but still avoided when unnecessary

### Where to Apply

- Every renderer that re-renders visible items per frame
- Masonry renderer ✅
- Grid renderer ✅ (`TrackedItem` with `lastItemId`, `lastSelected`, `lastFocused`, `lastTransform`)
- Core renderer ✅ (`TrackedItem` with `lastItemId`, `lastSelected`, `lastFocused`, `lastOffset`)
- Builder core inlined renderer (still uses unconditional DOM writes — see Known Limitations)

#### Core Renderer Note: Offset Tracking vs Transform String

The core renderer tracks `lastOffset` (a number) instead of `lastTransform`
(a string like grid does). This is because list positioning is a simple
`translateY(offset)` — comparing one number is cheaper than comparing a
composed string. Grid uses string comparison because its transform includes
both X (column) and Y (row + compression) components, making it simpler to
compare the final string than to track multiple intermediate values.

The `lastOffset` is captured during `renderItem` so that even the first
re-visit of a newly created item skips the redundant position write.

#### `updateItem` vs `render` — Different Change-Tracking Strategies

`updateItem` is an explicit API call signaling that item data has changed,
so it always re-applies the template — even when the id is unchanged (e.g.
a name update on the same record). It then updates TrackedItem fields so
subsequent scroll frames benefit from change tracking.

`render()` uses change tracking on the hot path: it skips template
re-evaluation, class toggles, and position writes when the tracked state
matches. This is the critical optimization for scroll performance.

#### Grid-Specific Note: Transform String Comparison

Grid uses `buildTransform()` → string comparison instead of `lastX`/`lastY`
numeric comparison. This is because grid positions depend on row offset
calculations (including compression), making it simpler to compare the final
transform string than to track all intermediate values.

---

## 12. Binary Search for Visibility

### Problem

Linear scan to find visible items is O(n) where n = total items. For 10K items, this runs 10K comparisons on every scroll frame.

### Prerequisite

Items must be sorted by position within their lane/row. This is guaranteed by:
- Masonry: shortest-lane algorithm produces Y-sorted items per lane
- Grid: rows are inherently sorted by row index
- List: items are inherently sorted by index

### Implementation (Per-Lane Binary Search)

```typescript
// Per-lane index lists — built during calculateLayout
let lanePlacements: number[][] = [];

const getVisibleItems = (placements, mainAxisStart, mainAxisEnd) => {
  for (let c = 0; c < columns; c++) {
    const laneIndices = lanePlacements[c]!;
    const laneLen = laneIndices.length;

    // Binary search: find first item where itemEnd > mainAxisStart
    let lo = 0, hi = laneLen;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const p = placements[laneIndices[mid]!]!;
      if (p.y + p.size <= mainAxisStart) lo = mid + 1;
      else hi = mid;
    }

    // Linear collect from first visible until past viewport
    for (let j = lo; j < laneLen; j++) {
      const p = placements[laneIndices[j]!]!;
      if (p.y >= mainAxisEnd) break;
      visiblePool.push(p);
    }
  }
};
```

### Complexity

- **Before:** O(n) linear scan
- **After:** O(k × log(n/k)) where k = columns/lanes, n = total items
- **Example:** 10K items, 4 columns → ~44 comparisons instead of 10,000

### Where to Apply

- Masonry layout ✅
- Grid layout (rows are sorted — binary search on row index; not yet applied, grid uses `sizeCache.indexAtOffset` which is already O(log n))
- Sections sticky header ✅ (binary search over group header offsets — O(log g) instead of O(g) linear scan per scroll frame)
- Sections layout (group boundary lookup was already O(log g) via `findGroupByLayoutIndex`)

---

## 13. Checklist

Use this checklist when optimizing any feature. Not every technique applies to every feature — skip what doesn't fit.

### Bundle Weight

- [ ] **Flatten nested interfaces** — Any `{ position: { x, y } }` or `{ range: { start, end } }` on per-item data?
- [ ] **Remove dead methods** — `grep` for call sites of every returned method. Remove uncalled ones.
- [ ] **DRY interception** — Multiple identical method-override blocks? Extract a helper.
- [ ] **Remove dead public API** — Getters/methods on layout/renderer interfaces that nobody reads?

### Per-Frame Allocations (Scroll Hot Path)

- [ ] **Early exit** — Does `renderIfNeeded` skip work when scroll position unchanged?
- [ ] **Pool result arrays** — Does `getVisibleItems` / `getVisibleRange` reuse an array?
- [ ] **Reuse Sets** — Is `new Set()` called inside `render()`? Use `.clear()` instead.
- [ ] **Cache closures** — Any lambda created inside `renderIfNeeded`? Move to setup scope.
- [ ] **Cache derived config** — Any `config.value ?? default` recomputed per frame? Precompute once.
- [ ] **Mutate in place** — Any `viewportState.range = { ... }` creating objects? Mutate fields directly.
- [ ] **Module-level constants** — Empty sets/arrays used as fallbacks? Share one instance.

### DOM Operations

- [ ] **DocumentFragment** — Multiple `appendChild` calls per frame? Batch with fragment.
- [ ] **Change tracking** — Template re-evaluated for unchanged items? Track lastItemId/lastSelected/lastFocused.
- [ ] **Position tracking** — `positionElement` called for items that haven't moved? Track lastX/lastY.
- [ ] **Release grace period** — Items at boundary recycled on small scroll? Add frame-based grace.

### Algorithmic

- [ ] **Binary search** — Linear scan for visibility? Items are sorted → use binary search.
- [ ] **Cached totals** — `getTotalSize` recomputed from placements? Cache during layout.
- [ ] **Cached derived layout** — Cross-axis sizes, offsets, strides recomputed? Cache and recompute only on config change.

---

## Allocation Profile Target

After applying all techniques, a **steady-state scroll frame** should have:

| Allocation | Target |
|-----------|--------|
| Result arrays | **0** (pooled) |
| Sets | **0** (reused) |
| Closures | **0** (cached) |
| State objects | **0** (mutated in place) |
| DocumentFragments | **0** (no new items entering) |
| Template evaluations | **0** (change tracking) |
| Position updates | **0** (position tracking) |
| **Total per-frame allocations** | **0** |

When items enter/exit the viewport (active scrolling):
- 1 DocumentFragment (batched)
- N template evaluations (new items only)
- N pool acquisitions (new items only)

---

## Measurement Commands

```bash
# Minified size
bunx esbuild src/features/<feature>/index.ts --bundle --format=esm --minify --outfile=/tmp/bundle.js
wc -c /tmp/bundle.js

# Gzipped size
gzip -c /tmp/bundle.js | wc -c

# Find dead methods
grep -rn "renderer\.\|layout\." src/features/<feature>/feature.ts

# Find per-frame allocations (new X inside render)
grep -n "new Set\|new Map\|new Array\|\[\]" src/features/<feature>/renderer.ts
```

---

## Known Limitations & Future Work

### Builder core inlined renderer ✅ (Fixed)

The builder core (`builder/core.ts`) inlined renderer has been updated with
all three optimizations (patterns 9–11), matching `rendering/renderer.ts`.

See **Applied Changes Log — February 2026 — Builder Core Inlined Renderer**
for details.

### `tick()` divergence between grid and masonry ✅ (Fixed)

Previously, grid's `tick()` method existed solely because the feature's
range-comparison shortcut skipped calling `render()` when the row-level range
was unchanged, requiring a separate code path to advance the grace period clock.

**Fix applied:** Removed the range-comparison shortcut in `gridRenderIfNeeded`.
The feature now always calls `gridRenderer.render()`, which is a near-no-op for
unchanged items thanks to the renderer's change tracking (`TrackedItem` diffing
skips template, class, and position updates). The grace-period release loop
inside `render()` advances the frame counter on every call, so items that left
the range are eventually released even when the row-level range is unchanged.

**What changed:**
- `features/grid/feature.ts` — Removed range-comparison early exit that called
  `tick()`, removed `lastItemRange` cache, added guard on `range:change` emit
  (only when range actually changed)
- `features/grid/renderer.ts` — Removed `tick()` method and its interface entry

**Cost:** `getItemRange()` + `getItemsInRange()` now run on every frame that
passes the scroll-position early exit, even when the row range is unchanged.
For grids without groups, `getItemRange` is O(1) (multiplication). For grids
with groups, it's O(n) but was already running on every range-changing frame.

### Selection feature state sync ✅ (Fixed)

Previously the selection feature bypassed the renderer entirely — it applied
selection classes via `querySelectorAll("[data-index]")` + regex-based ID
parsing + `classList.toggle` on **every rendered item, every frame**, even when
selection state hadn't changed. Renderers received `EMPTY_ID_SET` and `-1`,
making their change tracking for selection/focus a no-op.

**Fix applied:** The selection feature now registers internal getters
(`_getSelectedIds`, `_getFocusedIndex`) on `ctx.methods`. The core renderer,
grid feature, and masonry feature resolve these lazily (once, on first render
frame) and read real selection state directly. The `applySelectionClasses`
function and render-wrapping (`renderWithSelection`/`forceRenderWithSelection`)
were removed entirely.

On selection change (click, API call), the selection feature calls
`forceRender()` which resets `lastRenderRange` and triggers a full render pass.
The renderer's existing change tracking then applies classes only to items
whose selection/focus state actually changed — no DOM scan, no regex parsing,
no redundant `classList.toggle` calls.

**What changed:**
- `features/selection/feature.ts` — Removed `applySelectionClasses`, removed
  render wrapping, registered `_getSelectedIds`/`_getFocusedIndex`, simplified
  `renderAndEmit` → `forceRenderAndEmit`, simplified `clearSelection`
- `builder/core.ts` — Added lazy `resolveSelectionGetters()`, reads
  `selectionIdsGetter()`/`selectionFocusGetter()` instead of `$.ss`/`$.fi`
- `features/grid/feature.ts` — Same lazy resolution pattern, passes real
  selection state to `gridRenderer.render()` instead of `EMPTY_ID_SET`
- `features/masonry/feature.ts` — Already had the plumbing (`resolveSelectionMethods`),
  now works because selection actually registers the methods

**Impact:** Eliminated per-frame `querySelectorAll` + regex + classList work on
every scroll frame. The renderer's change tracking now fully covers selection,
meaning scroll-only frames (no selection change) do zero selection-related DOM
work. Selection changes do minimal targeted work via the existing
`TrackedItem.lastSelected`/`lastFocused` diffing.

---

## Applied Changes Log

### February 2026 — Grid `tick()` Removal

**Grid feature (`features/grid/feature.ts`):**
- Removed range-comparison early exit that called `gridRenderer.tick(lastItemRange)`
- Removed `lastItemRange` cache (no longer needed)
- Always calls `gridRenderer.render()` — change tracking makes unchanged items a no-op
- Added guard on `range:change` emit (only when range actually changed, since
  `render()` is now called on every frame)

**Grid renderer (`features/grid/renderer.ts`):**
- Removed `tick()` method and its `GridRenderer` interface entry
- Grace-period release loop inside `render()` now serves both purposes:
  advancing the clock on range-changing frames AND unchanged-range frames

### February 2026 — Selection Feature State Sync

**Selection feature (`features/selection/feature.ts`):**
- Removed `applySelectionClasses()` — the `querySelectorAll("[data-index]")` +
  regex ID parsing + `classList.toggle` DOM bypass that ran on every frame
- Removed `renderWithSelection` / `forceRenderWithSelection` render wrappers
- Registered `_getSelectedIds` and `_getFocusedIndex` internal getters on
  `ctx.methods` — these return live references to `selectionState.selected`
  and `selectionState.focusedIndex` (zero allocation per frame)
- Replaced `renderAndEmit` with `forceRenderAndEmit` — calls `forceRender()`
  (renderers pick up new state via getters) then emits `selection:change`
- Simplified `clearSelection` — now just clears state + `forceRenderAndEmit()`
  instead of manually calling `ctx.renderer.render()` with state params

**Builder core (`builder/core.ts`):**
- Added lazy `resolveSelectionGetters()` — resolves `_getSelectedIds` /
  `_getFocusedIndex` from `methods` Map once on first render frame, caches
  function references to avoid Map.get() on every scroll frame
- `coreRenderIfNeeded` reads `selectionIdsGetter()` / `selectionFocusGetter()`
  instead of `$.ss` / `$.fi` — falls back to `$.ss` / `$.fi` when no
  selection feature is present

**Grid feature (`features/grid/feature.ts`):**
- Added same lazy `resolveSelectionGetters()` pattern
- `gridRenderIfNeeded` passes real `selectedIds` / `focusedIndex` to
  `gridRenderer.render()` instead of `EMPTY_ID_SET` / `-1`

**Masonry feature (`features/masonry/feature.ts`):**
- No changes needed — already had `resolveSelectionMethods()` infrastructure
  that looked up `_getSelectedIds` / `_getFocusedIndex`. Now works because
  selection actually registers these methods.

**Key design decisions:**
- Getters resolved lazily because feature priority order is grid/masonry (10)
  → selection (50), but initial render runs after all features are set up
- Selection state returned by reference — the Set object may change on
  selection operations, but the getter always returns the current one
- `forceRender()` resets `lastRenderRange` to `-1` which forces the renderer
  to re-diff all items, applying selection classes via existing change tracking
- Keyboard focus-only moves still use targeted `updateItemClasses()` on just
  the 2 affected items (old focus, new focus) — not a full re-render

### February 2026 — Masonry + Grid

- All 12 patterns applied to masonry renderer and feature
- Patterns 9–11 applied to grid renderer
- Pattern 4 (early exit) applied to grid feature

### February 2026 — Core Renderer + Sections

**Core renderer (`rendering/renderer.ts`):**
- Pattern 10: Release grace period with `TrackedItem.lastSeenFrame` and `RELEASE_GRACE = 2`
- Pattern 11: Change tracking with `lastItemId`, `lastSelected`, `lastFocused`, `lastOffset`
- Pattern 9: Lazy `DocumentFragment` (null until first new item)
- Removed dead `positionElement` closure (all callers use inline offset calculation)
- `updateItem` always re-applies template (explicit API call) but updates TrackedItem fields
- `updateItemClasses` uses change tracking (skips when state unchanged)
- Size: 4,332 → 4,945 min (+613), 1,905 → 2,090 gz (+185) — cost of TrackedItem infrastructure

**Sections feature:**
- Pattern 12: Binary search in sticky header `update()` — O(log g) instead of O(g) per scroll frame
- Pattern 3 (DRY): Removed ~80 lines of duplicated `resolveScrollArgs`, `createSmoothScroll`, `easeInOutQuad`, `DEFAULT_SMOOTH_DURATION`; now imported from `builder/scroll.ts`
- Fixed bug: module-level `smoothScrollAnimationId` was shared state; now per-instance inside `createSmoothScroll` closure
- Array mutations: `push()`/`unshift()` instead of spread for `appendItems`/`prependItems`
- Size: 12,747 → 12,722 min (−25), 5,071 → 5,075 gz (+4) — roughly flat (deleted code offset by import)

**Grid feature:**
- Pattern 3 (DRY): Removed ~40 lines of duplicated `resolveScrollArgs`; now imported from `builder/scroll.ts`
- Size: 11,569 → 11,569 min (0), 4,637 → 4,615 gz (−22)

**Shared utilities (`builder/scroll.ts`):**
- Added `createSmoothScroll` factory with per-instance animation state
- Added `ScrollController` interface
- Size: 327 → 674 min (+347), 256 → 429 gz (+173) — loaded once, shared by all consumers

### February 2026 — Builder Core Inlined Renderer

**Builder core (`builder/core.ts`):**
- Pattern 10: Release grace period with `TrackedItem.lastSeenFrame` and `RELEASE_GRACE = 2`
- Pattern 11: Change tracking with `lastItemId`, `lastSelected`, `lastFocused`, `lastOffset`
- Pattern 9: Lazy `DocumentFragment` (null until first new item)
- Changed `rendered` from `Map<number, HTMLElement>` to `Map<number, TrackedItem>`
- `renderItem` now accepts `isSelected`/`isFocused` and returns `TrackedItem` (selection classes applied once at creation, not post-hoc)
- Pre-computed class names (`selectedClass`, `focusedClass`, `placeholderClass`, `replacedClass`) to avoid string concat on hot path
- Grace period release loop runs **before** the early-exit guard (unchanged range) so stale items expire even on stationary scroll frames
- `coreForceRender` advances `frameCounter += RELEASE_GRACE + 1` so `setItems([])` / `reload` / `invalidateRendered` flush stale items immediately
- Compressed mode repositioning loop stays unconditional (compression changes offsets unpredictably, offset tracking doesn't help)
- Offset tracking uses `Math.round($.hc.getOffset(i))` for comparison; `$.pef` only called when offset changed

**Materialize context (`builder/materialize.ts`):**
- `MDeps.rendered` type changed from `Map<number, HTMLElement>` to `Map<number, TrackedItem>`
- `updateItemClasses` syncs `tracked.lastSelected`/`lastFocused` so the render loop knows selection was applied out-of-band
- `getElement` returns `tracked.element` (transparent to callers)
- `invalidateRendered` iterates `tracked.element` for removal and pool release
- `updateItem` (data proxy) syncs `tracked.lastItemId` after re-applying template so subsequent scroll frames benefit from change tracking
- `TrackedItem` exported from `core.ts`, imported as `import type` in `materialize.ts` (type-only — no runtime circular dependency)

**Mode B measurement:**
- `newlyRenderedForMeasurement` now lazy-allocated (null until first unmeasured item)
- `itemResizeObserver.observe()` receives `tracked.element` — ResizeObserver observes the DOM element, not the wrapper
- `measuredElementToIndex` WeakMap still keyed by `HTMLElement` — no change needed

**Key design decisions:**
- Grace period release runs before early-exit (unlike renderer.ts which has no early-exit) — ensures frame counter advances expire stale items even when render range is unchanged
- `coreForceRender` flushes grace immediately — forced re-renders signal "the world changed" (setItems, reload), keeping ghost DOM nodes would leave orphans visible
- No offset tracking in compressed mode — compression changes all offsets unpredictably per scroll position, so the unconditional reposition loop is correct

---

**Last Updated:** February 2026
**Applied To:** masonry feature ✅, grid feature ✅, core renderer ✅, sections feature (sticky + DRY) ✅, builder core inlined renderer ✅, selection feature state sync ✅, grid tick() removal ✅
**Next:** All known optimizations applied. Profile for new bottlenecks.