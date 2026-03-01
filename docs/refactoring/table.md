# Table Feature — Optimization Plan

> **Current cost:** +4.4 KB gzipped (heaviest single feature)
> **Target:** ≤ +3.0 KB gzipped

## Current Measurements

```
bun run size

  Feature                   Minified    Gzipped         Delta
  ─────────────────────────────────────────────────────────
  Base                       23.2 KB     8.4 KB
  withGrid                   34.7 KB    12.3 KB       +3.9 KB
  withMasonry                29.9 KB    10.9 KB       +2.4 KB
  withGroups                 35.4 KB    12.6 KB       +4.1 KB
  withAsync                  34.5 KB    12.4 KB       +3.9 KB
  withSelection              29.4 KB    10.2 KB       +1.7 KB
  withScale                  32.0 KB    11.1 KB       +2.6 KB
  withScrollbar              27.0 KB     9.6 KB       +1.2 KB
  withPage                   24.5 KB     8.8 KB       +0.4 KB
  withSnapshots              24.7 KB     9.0 KB       +0.5 KB
  withTable                  37.1 KB    12.8 KB       +4.4 KB
```

### Per-file breakdown (standalone builds)

| File | Lines | Minified | Gzipped | Role |
|------|-------|----------|---------|------|
| `feature.ts` | 603 | 14.0 KB | 5.1 KB | Orchestrator — wires header, renderer, layout into builder |
| `renderer.ts` | 663 | 4.6 KB | 1.8 KB | Row/cell rendering, pooling, change tracking |
| `header.ts` | 494 | 4.0 KB | 1.6 KB | Sticky header, resize handles, sort indicators |
| `layout.ts` | 247 | 1.5 KB | 0.7 KB | Column width resolution, offsets |
| **Total** | **2007** | | | |

Note: `feature.ts` is 14.0 KB standalone because it bundles its imports. The +4.4 KB delta is the true incremental cost after tree-shaking shared core code.

---

## Optimizations

### 1. Shared Element Pool (cross-feature)

**Problem:** Four identical `createElementPool` implementations exist:

- `src/builder/pool.ts` (core)
- `src/features/grid/renderer.ts`
- `src/features/masonry/renderer.ts`
- `src/features/table/renderer.ts`

Each is ~40 lines with nearly identical acquire/release/clear logic. The table's version differs only in which attributes it clears on release.

**Solution:** Extract a shared `createElementPool` to a common location (e.g. `src/rendering/pool.ts`) that accepts a configurable reset function. Each renderer passes its own reset logic.

```ts
// src/rendering/pool.ts
export const createElementPool = (
  reset: (el: HTMLElement) => void,
  maxSize = 200,
): ElementPool => {
  const pool: HTMLElement[] = [];
  return {
    acquire: () => pool.pop() ?? document.createElement("div"),
    release: (el) => {
      el.remove();
      if (pool.length < maxSize) { reset(el); pool.push(el); }
    },
    clear: () => { pool.length = 0; },
  };
};
```

**Estimated saving:** ~0.2 KB gzipped (deduplicated across features)

**Files changed:**
- New: `src/rendering/pool.ts`
- Modified: `src/features/table/renderer.ts` — import shared pool, pass table-specific reset
- Modified: `src/features/grid/renderer.ts` — same
- Modified: `src/features/masonry/renderer.ts` — same
- Modified: `src/builder/pool.ts` — re-export from shared or keep as-is (core has different defaults)

**Risk:** Low. Pool is a simple data structure. Each renderer still controls its own reset semantics.

---

### 2. Inline helper for repeated aria-selected toggle

**Problem:** The `aria-selected` toggle pattern appears **5 times** in `renderer.ts`:

```ts
if (isSelected) {
  element.setAttribute("aria-selected", "true");
} else {
  element.removeAttribute("aria-selected");
}
```

Found in: `renderRow`, `render` (×2 — idChanged + stateChanged branches), `updateItem`, `updateItemClasses`.

**Solution:** Extract a tiny inline helper:

```ts
const setAriaSelected = (el: HTMLElement, selected: boolean): void => {
  if (selected) el.setAttribute("aria-selected", "true");
  else el.removeAttribute("aria-selected");
};
```

**Estimated saving:** ~0.1 KB gzipped (5 × 4 lines → 5 × 1 line + 3 line helper)

**Files changed:**
- `src/features/table/renderer.ts`

**Risk:** None. Pure refactor.

---

### 3. Conditional header cell children

**Problem:** Every header cell creates **4 child elements** regardless of config:

1. Cell container (`div.vlist-table-header-cell`)
2. Content wrapper (`div.vlist-table-header-content`)
3. Sort indicator (`span.vlist-table-header-sort`) — even for non-sortable columns
4. Resize handle (`div.vlist-table-header-resize`) — already conditional on `col.resizable`

The sort indicator is created for every column and hidden with `opacity: 0`. For a 10-column table, that's 10 invisible `<span>` elements with event listeners and ARIA attributes.

**Solution:** Only create the sort indicator when `col.def.sortable` is true.

Current code in `header.ts` `createCell()`:
```ts
// Always created:
const sortIndicator = document.createElement("span");
sortIndicator.className = `${classPrefix}-table-header-sort`;
sortIndicator.setAttribute("aria-hidden", "true");
cell.appendChild(sortIndicator);
sortIndicators.push(sortIndicator);

// Sortable class added conditionally:
if (col.def.sortable) {
  cell.classList.add(`${classPrefix}-table-header-cell--sortable`);
}
```

New approach:
```ts
if (col.def.sortable) {
  const sortIndicator = document.createElement("span");
  sortIndicator.className = `${classPrefix}-table-header-sort`;
  sortIndicator.setAttribute("aria-hidden", "true");
  cell.appendChild(sortIndicator);
  cell.classList.add(`${classPrefix}-table-header-cell--sortable`);
}
// Push null for non-sortable columns to keep index alignment
sortIndicators.push(col.def.sortable ? sortIndicator : null);
```

The `updateSort` function must then null-check each indicator:
```ts
const indicator = sortIndicators[i];
if (!indicator) continue;
```

**Estimated saving:** ~0.05 KB gzipped (marginal code size), but meaningful **DOM savings** at runtime — fewer elements, fewer style recalcs.

**Files changed:**
- `src/features/table/header.ts`

**Risk:** Low. Must update `sortIndicators` type to `(HTMLElement | null)[]` and null-check in `updateSort`.

---

### 4. Deduplicate render loop (feature.ts ↔ core.ts)

**Problem:** `feature.ts` contains a full `tableRenderIfNeeded` function (~80 lines) that largely mirrors `coreRenderIfNeeded` in `core.ts`. The table version:

1. Reads scroll position + container height
2. Early-exits on unchanged state
3. Computes visible range via `sizeCache.indexAtOffset`
4. Applies overscan
5. Updates `viewportState` fields
6. Gets items from data manager
7. Resolves selection state
8. Calls renderer
9. Emits `range:change`

Steps 1–6 and 8–9 are identical to the core. Only step 7 (calling the table renderer instead of the list renderer) differs.

The grid feature (`grid/feature.ts`) has the **same duplication** (~90 lines).

**Solution:** Extract the shared render loop skeleton into a reusable helper in `src/builder/` that accepts a render callback:

```ts
// src/builder/render-loop.ts
export const createFeatureRenderLoop = (opts: {
  ctx: BuilderContext;
  overscan: number;
  render: (items, range, selectedIds, focusedIndex) => void;
}) => {
  let lastScrollPosition = -1;
  let lastContainerSize = -1;
  let forceNextRender = true;
  const visibleRange = { start: 0, end: 0 };
  const renderRange = { start: 0, end: 0 };

  const renderIfNeeded = (): void => {
    // ... shared scroll/range/viewport logic ...
    opts.render(items, renderRange, selectedIds, focusedIndex);
    // ... range:change emission ...
  };

  const forceRender = (): void => {
    forceNextRender = true;
    renderIfNeeded();
  };

  return { renderIfNeeded, forceRender };
};
```

Then in `feature.ts`:
```ts
const { renderIfNeeded, forceRender } = createFeatureRenderLoop({
  ctx,
  overscan,
  render: (items, range, selectedIds, focusedIndex) => {
    tableRenderer!.render(items, range, selectedIds, focusedIndex);
  },
});
ctx.setRenderFns(renderIfNeeded, forceRender);
```

**Estimated saving:** ~0.3–0.5 KB gzipped (eliminates ~80 lines from table, ~90 from grid). The helper itself is shared, so its cost is amortized when any layout feature is used.

**Files changed:**
- New: `src/builder/render-loop.ts`
- Modified: `src/features/table/feature.ts` — replace inline render loop
- Modified: `src/features/grid/feature.ts` — replace inline render loop (bonus)
- Modified: `src/builder/types.ts` — export helper types if needed

**Risk:** Medium. The render loop is a hot path — the abstraction must add zero overhead. The helper should inline well since it's a simple closure. The grid feature also needs adapting (different item-to-row mapping), but can pass its own render callback. Test both features carefully.

**Important:** The grid render loop has additional logic (row-to-item index conversion, compression support) that the table doesn't need. The helper must be flexible enough to accommodate both without forcing grid complexity onto the table path. Consider whether the helper covers steps 1–6 + 9 only, letting each feature handle step 7 (render call) and any feature-specific logic.

---

### 5. Reduce ARIA attribute overhead in pool release

**Problem:** The table pool's `release` clears 7 attributes individually:

```ts
element.removeAttribute("data-id");
element.removeAttribute("data-index");
element.removeAttribute("aria-selected");
element.removeAttribute("aria-setsize");
element.removeAttribute("aria-posinset");
element.removeAttribute("aria-rowindex");
element.removeAttribute("role");
element.style.cssText = "";
element.textContent = "";
```

Some of these are never set by the table renderer (`aria-setsize`, `aria-posinset`) — they're leftovers from the list renderer's pool. The table uses `aria-rowindex` instead of `aria-posinset`, and never sets `aria-setsize` on individual rows.

**Solution:** Remove unused attribute clears. Only clear what the table renderer actually sets:

```ts
element.className = "";
element.removeAttribute("data-id");
element.removeAttribute("data-index");
element.removeAttribute("aria-selected");
element.removeAttribute("aria-rowindex");
element.removeAttribute("role");
element.style.cssText = "";
element.textContent = "";
```

This removes 2 unnecessary `removeAttribute` calls per release. With pooling of ~20–40 visible rows, that's 40–80 fewer DOM API calls per scroll cycle.

**Estimated saving:** Negligible code size, but **measurable runtime improvement** in the pool release hot path.

**Files changed:**
- `src/features/table/renderer.ts` (or shared pool if optimization 1 is done first)

**Risk:** None. Pure cleanup of attributes that are never set.

---

### 6. Pre-format translateY strings

**Problem:** On every render frame, each row builds a `translateY(${offset}px)` string for comparison and assignment:

```ts
const offset = sizeCache.getOffset(i);
const transform = `translateY(${offset}px)`;
if (existing.lastTransform !== transform) {
  existing.element.style.transform = transform;
  existing.lastTransform = transform;
}
```

Template literal allocation happens even when the transform hasn't changed (which is the common case for most rows during a scroll frame).

**Solution:** Compare numeric offsets instead of strings. Only build the string when the value actually changed:

```ts
const offset = sizeCache.getOffset(i);
if (existing.lastOffset !== offset) {
  existing.lastOffset = offset;
  const transform = `translateY(${offset}px)`;
  existing.element.style.transform = transform;
}
```

Replace `lastTransform: string` with `lastOffset: number` in `TrackedRow`. This avoids string allocation on the fast path (unchanged position).

Apply the same pattern in `renderRow` for initial creation.

**Estimated saving:** ~0.05 KB gzipped, but **meaningful runtime improvement** — eliminates a string allocation per row per frame on the hot scroll path.

**Files changed:**
- `src/features/table/renderer.ts` — `TrackedRow` interface, `renderRow`, `render` fast path

**Risk:** None. Same comparison semantics, just numeric instead of string.

---

## Implementation Order

Ordered by impact (size + runtime) and dependency:

| Step | Optimization | Size Δ (est.) | Runtime Δ | Dependencies |
|------|-------------|---------------|-----------|--------------|
| 1 | Shared Element Pool | −0.2 KB | neutral | none |
| 2 | aria-selected helper | −0.1 KB | neutral | none |
| 3 | Conditional header children | −0.05 KB | fewer DOM nodes | none |
| 4 | Deduplicate render loop | −0.3–0.5 KB | neutral | none (but benefits grid too) |
| 5 | Prune unused attribute clears | ~0 KB | fewer DOM calls | after step 1 |
| 6 | Numeric offset comparison | −0.05 KB | fewer string allocs | none |

**Steps 1–3** are safe, isolated refactors — do them first.
**Step 4** is the highest-impact but also the most complex — do it after 1–3 are landed and tested.
**Steps 5–6** are micro-optimizations — do them last or bundle with other changes.

### Estimated total saving: ~0.7–0.9 KB gzipped

That would bring `withTable` from **+4.4 KB** down to roughly **+3.5–3.7 KB**, closer to `withGrid` (+3.9 KB) and `withGroups` (+4.1 KB). Step 4 additionally helps `withGrid`.

---

## Verification

After each step:

```bash
# Run all tests
bun test

# Run table tests specifically
bun test test/features/table/

# Measure sizes
bun run size

# Build and check output
bun run build
```

After all steps:

```bash
# Full test suite
bun test

# Visual verification on the dev site
# (restart server after bun install)
bun run build:examples
bun run server.ts
# → http://localhost:3338/examples/data-table
```

---

*Last updated: July 2025*