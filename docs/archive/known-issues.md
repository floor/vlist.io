# Known Issues & Roadmap

> Honest assessment of current limitations and prioritized plan to make vlist the best vanilla virtual list.

## Current State

vlist is a well-optimized, batteries-included virtual list with zero dependencies. It supports fixed and variable item heights, grid layout, sticky headers, reverse mode (chat), built-in selection, keyboard navigation, infinite scroll, framework adapters, and 1M+ item compression.

**Where vlist wins today:**
- ✅ Zero dependencies
- ✅ Automatic compression for 1M+ items (no competitor does this)
- ✅ Built-in selection (single/multi/keyboard) — competitors say "BYO"
- ✅ Built-in infinite scroll with adapter, placeholders, velocity-based loading
- ✅ Variable item heights via `height: (index) => number` (Mode A)
- ✅ Window/document scrolling via `scroll: { element: window }`
- ✅ Custom scrollbar by default, native or none via `scroll: { scrollbar }`
- ✅ Wheel control — enable/disable mouse wheel via `scroll: { wheel }`
- ✅ Wrap navigation — circular `scrollToIndex` for carousels/wizards via `scroll: { wrap }`
- ✅ Grid layout with O(1) row/column mapping and compression support
- ✅ Sticky headers / grouped lists with push-out transitions
- ✅ Horizontal scrolling via `orientation: 'horizontal'` (carousels, timelines)
- ✅ Reverse mode for chat UIs with scroll-position-preserving prepend
- ✅ Framework adapters — React, Vue 3, Svelte (< 1 KB each)
- ✅ Smooth `scrollToIndex` animation with easing
- ✅ Scroll position save/restore (JSON-serializable snapshots)
- ✅ Modular imports — `vlist/core` at 3.0 KB gzip (smaller than TanStack)
- ✅ Extensive scroll hot-path optimizations (zero-allocation, RAF-throttled, circular buffer velocity)
- ✅ 816 tests (3,620 assertions), comprehensive documentation

**Where vlist falls short:**

| Gap | Impact | Competitors |
|-----|--------|-------------|
| No auto-height measurement (Mode B) | ⚠️ Mode A covers known heights; Mode B needed for dynamic content | @tanstack/virtual ✅ |
| ~~No horizontal scrolling~~ | ✅ Shipped | @tanstack/virtual ✅ |
| Basic accessibility | ⚠️ Missing aria-setsize/posinset | — |
| No public benchmarks | ⚠️ Performance claims lack proof | — |
| ~~No grid layout~~ | ✅ Shipped | @tanstack/virtual ✅ |
| ~~No window (document) scrolling~~ | ✅ Shipped | @tanstack/virtual ✅ |
| ~~No sticky headers / grouped lists~~ | ✅ Shipped | react-virtuoso ✅ |
| ~~No reverse mode (chat UI)~~ | ✅ Shipped | react-virtuoso ✅ |
| ~~No framework adapters~~ | ✅ Shipped | @tanstack/virtual ✅ |
| ~~Bundle ~12.2 KB gzip~~ | ✅ Core 3.0 KB gzip (smaller than TanStack ~5.5 KB) | @tanstack/virtual ✅ |

---

## Phase 1 — Remove Dealbreakers

### 1. ✅ Variable Item Heights — Mode A (Function-Based Known Heights)

**Status:** ✅ **Shipped** — Mode A (function-based known heights) is implemented.

**What shipped:**

`ItemConfig.height` now accepts `number | ((index: number) => number)`:

```typescript
// Fixed height (existing, zero-overhead fast path)
item: {
  height: 48,
  template: myTemplate,
}

// Variable height via function (NEW)
item: {
  height: (index: number) => items[index].type === 'header' ? 64 : 48,
  template: myTemplate,
}
```

**Architecture:**

A new `HeightCache` abstraction (`src/render/heights.ts`) encapsulates height lookups:
- **Fixed implementation:** O(1) via multiplication — zero overhead, matches previous behavior
- **Variable implementation:** O(1) offset lookup via prefix-sum array, O(log n) binary search for index-at-offset

All rendering, compression, and scroll functions (`virtual.ts`, `compression.ts`, `renderer.ts`, `handlers.ts`, `methods.ts`) accept `HeightCache` instead of `itemHeight: number`. The fixed-height `HeightCache` uses pure multiplication internally, so there is **zero performance regression** for fixed-height lists.

Compression works with variable heights: the compression ratio uses actual total height from the cache, and near-bottom interpolation counts items fitting from bottom using actual heights.

**What remains (Mode B — follow-up):**

```typescript
// Mode B: Estimated + measured (most flexible, what tanstack does)
item: {
  estimatedHeight: 48,  // Initial guess for scroll math
  template: myTemplate, // vlist measures after render, caches actual height
}
```

Mode B (auto-measurement with `estimatedHeight`) is a separate follow-up. It requires DOM measurement after render and dynamic cache updates, which is a different complexity level.

---

### 2. ✅ Smooth `scrollToIndex` Animation

**Status:** Done

**Implementation:** Custom `easeInOutQuad` animation loop that works in both native and compressed scroll modes. Fully backward-compatible API — the second argument accepts either a string alignment or a `ScrollToOptions` object.

```typescript
// Old API still works
list.scrollToIndex(500, 'center');

// New smooth scrolling
list.scrollToIndex(500, { align: 'center', behavior: 'smooth' });
list.scrollToIndex(500, { behavior: 'smooth', duration: 500 });

// Cancel in-progress animation
list.cancelScroll();

// Also works on scrollToItem
list.scrollToItem('user-123', { align: 'center', behavior: 'smooth' });
```

**New type:**
```typescript
interface ScrollToOptions {
  align?: 'start' | 'center' | 'end';
  behavior?: 'auto' | 'smooth';
  duration?: number; // default: 300ms
}
```

**Changes:** `src/types.ts`, `src/methods.ts`, `src/index.ts`, `test/methods.test.ts` (+12 tests)

---

### 3. ✅ Shrink Bundle Size

**Status:** Done (sub-module split + lazy-init placeholder + lightweight core entry)

**a) Split entry points for tree-shaking — Done:**

Consumers can import individual sub-modules instead of the full bundle:

```typescript
import { vlist } from 'vlist'                    // full bundle
import { vlist } from 'vlist/core'               // 7.3 KB / 3.0 KB gzip (83% smaller!)
import { createSparseStorage } from 'vlist'       // 9.2 KB / 3.8 KB gzip
import { getCompressionInfo } from 'vlist'  // 2.6 KB / 1.1 KB gzip
import { createSelectionState } from 'vlist'  // 1.9 KB / 0.7 KB gzip
import { createScrollController } from 'vlist'   // 6.0 KB / 2.3 KB gzip
import { createGroupLayout } from 'vlist'        // 3.6 KB / 1.4 KB gzip
```

Bundle sizes after split:

| Import | Minified | Gzipped | Description |
|--------|----------|---------|-------------|
| `vlist` (full) | 42.3 KB | 13.9 KB | All features |
| **`vlist/core`** | **7.3 KB** | **3.0 KB** | **Lightweight — no selection, groups, compression, scrollbar, or adapter** |
| `vlist (withAsync)` | 9.2 KB | 3.8 KB | Sparse storage, placeholders, data manager |
| `vlist (withScrollbar)` | 6.0 KB | 2.3 KB | Scroll controller + custom scrollbar |
| `vlist (withGroups)` | 3.6 KB | 1.4 KB | Group layout + sticky headers |
| `vlist (withScale)` | 2.6 KB | 1.1 KB | Large-list compression utilities |
| `vlist/selection` | 1.9 KB | 0.7 KB | Selection state management |

**b) Lazy-init placeholder manager — Done (Z3):**

The placeholder manager (~400 lines) is now only instantiated when first needed (i.e., when an unloaded item is requested). Static `items: [...]` lists never create it.

**c) Lightweight core entry (`vlist/core`) — Done:**

A self-contained, minimal `vlist` factory at **7.3 KB minified / 3.0 KB gzipped** — an **83% reduction** vs the full bundle. It covers the most common use case (static or streaming lists) and supports:

- ✅ Fixed and variable item heights
- ✅ `scrollToIndex` / `scrollToItem` with smooth animation
- ✅ `setItems` / `appendItems` / `prependItems` / `updateItem` / `removeItem`
- ✅ Events (`scroll`, `item:click`, `range:change`, `resize`)
- ✅ Window (document) scrolling
- ✅ ResizeObserver for container resize
- ✅ DOM element pooling & DocumentFragment batching

It deliberately omits (use full `vlist` if needed):

- ❌ Selection / keyboard navigation
- ❌ Groups / sticky headers
- ❌ Compression (lists > ~100K items)
- ❌ Custom scrollbar
- ❌ Async data adapter / placeholders
- ❌ Velocity tracking / load cancellation

The core module is fully self-contained — zero imports from the full bundle's internal modules — so bundlers pull in only the ~7 KB file with no hidden transitive dependencies.

**Changes:** `build.ts`, `package.json`, `src/core.ts` (new), `src/compression.ts`, `src/data/manager.ts`

---

## Phase 2 — Expand Layout Modes

### 4. ✅ Horizontal Scrolling

**Priority:** Medium. **Status: DONE**

**Problem:** Some UIs need horizontal lists (carousels, timelines, horizontal menus). Currently vlist is vertical-only.

**Solution:** Added `orientation: 'horizontal'` config option with axis-aware rendering, scrolling, and CSS:

```typescript
const list = vlist({
  container: '#carousel',
  orientation: 'horizontal', // new option (default: 'vertical')
  item: {
    width: 200,  // use width instead of height in horizontal mode
    template: (item) => `<div class="card">${item.title}</div>`,
  },
  items: cards,
});
```

**What was implemented:**
- `orientation: 'horizontal'` config option (default: `'vertical'`)
- `item.width` for scroll-axis dimension (replaces `item.height` in horizontal mode)
- Axis-aware scroll controller: `scrollLeft` ↔ `scrollTop`, `deltaX` ↔ `deltaY`
- Axis-aware renderer: `translateX` ↔ `translateY`, width sizing ↔ height sizing
- Axis-aware DOM structure: `overflow-x` ↔ `overflow-y`, content width ↔ height
- Mouse wheel translation: vertical `deltaY` automatically translated to horizontal scroll (configurable via `scroll: { wheel }`)
- Custom scrollbar renders along bottom edge with horizontal thumb (`translateX`, `clientX` drag)
- `.vlist--horizontal` CSS modifier with horizontal item layout and scrollbar
- Keyboard navigation: ArrowLeft/ArrowRight instead of ArrowUp/ArrowDown
- `aria-orientation="horizontal"` for accessibility
- Compression works identically on the horizontal axis
- Validation: cannot combine with grid, groups, or window scrolling

**Files changed:** `types.ts`, `config.ts`, `context.ts`, `render/dom.ts`, `render/renderer.ts`, `render/index.ts`, `scroll/controller.ts`, `styles/vlist.css`, `handlers.ts`, `vlist.ts`, `index.ts`

---

### 5. ✅ Grid Layout

**Priority:** Medium. **Status: DONE**

**Problem:** Image galleries, card grids, and dashboard tiles need 2D virtualization. This is a top use case that no vanilla library handles well.

**Solution:** Added `layout: 'grid'` with a dedicated `grid` configuration option:

```typescript
const grid = vlist({
  container: '#gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: {
    height: 200,
    template: (item) => `<img src="${item.thumbnail}" />`,
  },
  items: photos,
});
```

**Implementation details:**
- New `src/grid/` module: `layout.ts` (O(1) flat-index ↔ row/col mapping), `renderer.ts` (2D positioning with `translate(x, y)`), `types.ts`
- Virtualization operates on **rows** (not items): visible rows × columns = visible items
- `createGridLayout()` provides zero-allocation `getPosition()` (reusable object), `getTotalRows()`, `getItemRange()`, `getColumnWidth()`, `getColumnOffset()` — all O(1) integer math
- `createGridRenderer()` extends the base renderer pattern with 2D positioning: items use `translate(colOffset, rowOffset)` for GPU-accelerated placement
- Height cache operates on row indices; row height = item height + gap (renderer subtracts gap for DOM element sizing)
- Container resize updates column widths and repositions all rendered items
- Compression applies to row count, not item count — large grids (1M+ items) compress seamlessly
- Element pool with grid-specific data attributes (`data-row`, `data-col`)
- Validation: cannot combine grid with `groups` or `reverse` mode (throws at creation time)
- CSS: `.vlist--grid` modifier, `.vlist-grid-item` element class
- Exported as `vlist/grid` subpath (1.4 KB gzip standalone)
- 55 tests covering layout math, round-trips, edge cases, and renderer behavior

**Changes:** `src/grid/layout.ts` (new), `src/grid/renderer.ts` (new), `src/grid/types.ts` (new), `src/grid/index.ts` (new), `src/vlist.ts`, `src/types.ts`, `build.ts`, `package.json`

---

### 6. ✅ Window (Document) Scrolling

**Status:** ✅ **Shipped** — `scroll: { element: window }` option implemented.

**What shipped:**

Pass `scroll: { element: window }` to make the list participate in normal page flow instead of scrolling inside its own container:

```typescript
const list = vlist({
  container: '#results',
  scroll: { element: window },  // list scrolls with the page
  item: { height: 48, template: myTemplate },
  items: searchResults,
});
```

**How it works:**

- **Viewport**: Set to `overflow: visible`, `height: auto` — the list sits in the page flow
- **Scroll tracking**: RAF-throttled `window.scroll` listener computes list-relative position from `viewport.getBoundingClientRect()`
- **Container height**: Derived from `window.innerHeight`, updated on resize
- **scrollTo()**: Delegates to `window.scrollTo()` with the list's document offset
- **Compression**: Still works — content height is capped, scroll math is remapped, but the browser scrolls natively (no wheel interception)
- **Custom scrollbar**: Automatically disabled (the browser's native scrollbar is used)
- **Cleanup**: Window scroll and resize listeners are properly removed on `destroy()`

**Architecture details:**

Scroll controller changes:
- `getScrollTop()` returns tracked `scrollPosition` (viewport.scrollTop is 0 in window mode)
- `enableCompression` / `disableCompression` skip overflow and wheel interception (browser scrolls natively)
- `isAtBottom` / `getScrollPercentage` use `maxScroll` in window mode
- New `isWindowMode()` and `updateContainerHeight()` methods on the interface

VList wiring:
- Window resize listener updates `containerHeight` and re-renders
- ResizeObserver still watches the viewport element for content-driven changes

**Changes:** `src/types.ts`, `src/scroll/controller.ts`, `src/vlist.ts`, `test/scroll/controller.test.ts` (+18 tests, 561 total)

---

## Phase 3 — Advanced Patterns

### 7. ✅ Sticky Headers / Grouped Lists

**Priority:** Medium. **Status: DONE**

**Problem:** Grouped lists with sticky section headers (like iOS Contacts: A, B, C...) are a ubiquitous UI pattern. No vanilla library does this cleanly.

**Solution:** Added a `groups` configuration option to `vlist` that automatically derives group boundaries from a user-provided function, inserts header pseudo-items into the layout, and manages a sticky header overlay element.

```typescript
const list = vlist({
  container: '#contacts',
  item: { height: 48, template: contactTemplate },
  groups: {
    getGroupForIndex: (index) => contacts[index].lastName[0],
    headerHeight: 32,
    headerTemplate: (group) => `<div class="section-header">${group}</div>`,
    sticky: true,
  },
  items: contacts,
});
```

**Implementation details:**
- New `src/groups/` module: `layout.ts` (group boundary computation, O(log g) index mapping), `sticky.ts` (floating header overlay with push-out transition), `types.ts`
- Group headers are virtual pseudo-items interleaved with data items via `buildLayoutItems()`
- `createGroupedSizeFn()` wraps the item size config to return header sizes at group boundaries
- Sticky header is an absolutely-positioned overlay element updated on scroll — classic iOS Contacts-style push-out effect when the next group's header approaches
- Public API (`items`, `total`, `scrollToIndex`, data methods) transparently maps between data indices and layout indices
- Works with fixed and variable item heights, compression, and all existing features
- 45 new tests for group layout computation, index mapping round-trips, and edge cases
- Examples example: `examples/sticky-headers/` — 2,000 contacts grouped A–Z
- CSS: `.vlist--grouped` modifier, `.vlist-sticky-header` overlay, `--vlist-group-header-bg` custom property

---

### 8. ✅ Reverse Mode (Chat UI)

**Priority:** Medium.

**Problem:** Chat and messaging UIs start scrolled to the bottom and prepend messages on top. This is a very common pattern that's surprisingly hard to get right with virtual scrolling.

**Implementation:** Added `reverse: true` config option. Items stay in chronological order (oldest = index 0). The reverse behavior is handled entirely in the orchestration layer (`vlist.ts`) by wrapping data methods and adjusting scroll positioning — no changes to the renderer, height cache, or core virtualization math.

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: 60,          // fixed or variable: (index) => number
    template: messageTemplate,
  },
  items: messages,       // chronological order (oldest first)
});

// New message arrives — auto-scrolls to bottom if user was at bottom
chat.appendItems([newMessage]);

// Load older messages — scroll position preserved (no jump)
chat.prependItems(olderMessages);
```

**What `reverse: true` does:**

| Behavior | Normal mode | Reverse mode |
|----------|------------|--------------|
| Initial scroll position | Top (index 0) | Bottom (last item) |
| `appendItems()` | No auto-scroll | Auto-scrolls to bottom if user was at bottom |
| `prependItems()` | No scroll adjustment | Adjusts scrollTop to keep current content stable |
| Adapter "load more" trigger | Near bottom | Near top |

**Architecture details:**
- **Initial scroll to bottom** — After first render (or after initial adapter load), calls `scrollToIndex(total - 1, 'end')`
- **appendItems auto-scroll** — Checks `isAtBottom()` before appending; if true, scrolls to new bottom after append
- **prependItems scroll preservation** — Records `scrollTop` and `totalHeight` before prepend, then adjusts `scrollTop += (newHeight - oldHeight)` so the same content stays visible
- **Adapter load at top** — Scroll handler checks `scrollTop < LOAD_THRESHOLD` instead of `distanceFromBottom < LOAD_THRESHOLD`
- **Validation** — Cannot be combined with `groups` or `grid` layout (throws at creation time)
- Works with both fixed and variable `(index) => number` heights
- All existing features (selection, events, scroll save/restore, compression) work unchanged

**With adapter (infinite scroll for older messages):**

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: (index) => messages[index]?.type === 'image' ? 200 : 60,
    template: messageTemplate,
  },
  adapter: {
    read: async ({ offset, limit }) => {
      // Load more triggers at the TOP in reverse mode
      const messages = await api.getMessages({ skip: offset, take: limit });
      return { items: messages, total: totalCount, hasMore: offset + limit < totalCount };
    },
  },
});
```

---

### 9. ✅ Framework Adapters

**Priority:** Medium — for adoption, not for the core library.

**Problem:** React/Vue/Svelte/Solid developers won't use a vanilla library directly if ergonomic framework wrappers exist elsewhere (tanstack).

**Approach:** Keep vlist as the pure vanilla core. Ship optional thin **mount-based** wrappers (<1 KB each). The framework manages the container element lifecycle, while vlist does all DOM rendering internally — preserving vlist's full performance model (direct DOM manipulation, no virtual DOM overhead).

**Implementation:** Three adapters shipped as separate subpath exports with framework + vlist core externalized:

| Adapter | Import | Minified | Gzipped | Exports |
|---------|--------|----------|---------|---------|
| React | `vlist/react` | 0.7 KB | 0.4 KB | `useVList` hook, `useVListEvent` |
| Vue 3 | `vlist/vue` | 0.5 KB | 0.4 KB | `useVList` composable, `useVListEvent` |
| Svelte | `vlist/svelte` | 0.3 KB | 0.2 KB | `vlist` action, `onVListEvent` |

#### React — `useVList` hook

```tsx
import { useVList, useVListEvent } from 'vlist/react';

function UserList({ users }) {
  const { containerRef, instanceRef } = useVList({
    item: {
      height: 48,
      template: (user) => `<div class="user">${user.name}</div>`,
    },
    items: users,
    selection: { mode: 'single' },
  });

  // Subscribe to events with automatic cleanup
  useVListEvent(instanceRef, 'selection:change', ({ selected }) => {
    console.log('Selected:', selected);
  });

  return (
    <div
      ref={containerRef}
      style={{ height: 400 }}
      onClick={() => instanceRef.current?.scrollToIndex(0)}
    />
  );
}
```

Returns `containerRef` (bind to div), `instanceRef` (access methods via `.current`), and `getInstance()` helper. Items auto-sync when `config.items` changes by reference.

#### Vue 3 — `useVList` composable

```vue
<template>
  <div ref="containerRef" style="height: 400px" />
</template>

<script setup lang="ts">
import { useVList, useVListEvent } from 'vlist/vue';

const { containerRef, instance } = useVList({
  item: {
    height: 48,
    template: (user) => `<div class="user">${user.name}</div>`,
  },
  items: users,
});

useVListEvent(instance, 'selection:change', ({ selected }) => {
  console.log('Selected:', selected);
});
</script>
```

Accepts a plain config or a reactive `Ref<Config>`. When using a ref, items are watched and synced automatically.

#### Svelte — `vlist` action

```svelte
<script>
  import { vlist, onVListEvent } from 'vlist/svelte';
  import { onDestroy } from 'svelte';

  let instance;
  let unsubs = [];

  const options = {
    config: {
      item: {
        height: 48,
        template: (user) => `<div class="user">${user.name}</div>`,
      },
      items: users,
    },
    onInstance: (inst) => {
      instance = inst;
      unsubs.push(
        onVListEvent(inst, 'selection:change', ({ selected }) => {
          console.log('Selected:', selected);
        })
      );
    },
  };

  onDestroy(() => unsubs.forEach(fn => fn()));
</script>

<div use:vlist={options} style="height: 400px" />
```

Follows the standard Svelte `use:` directive contract. Works with both Svelte 4 and 5 with zero Svelte imports. Instance access via `onInstance` callback. Pass reactive options via `$:` to trigger updates.

**Design decisions:**
- Mount-based (not virtual-items-based like TanStack Virtual) — keeps adapters trivially thin and preserves vlist's direct DOM rendering performance
- Each adapter also ships a companion event helper (`useVListEvent` / `onVListEvent`) for ergonomic event subscription with automatic cleanup
- Built with `external: ['react'|'vue', 'vlist']` so the adapter bundles contain only wrapper code
- React/Vue listed as optional `peerDependencies`; Svelte needs no framework imports at all

---

## Phase 4 — Prove It's The Best

### 10. ✅ Public Benchmark Page

**Priority:** High (for marketing).

**Implemented — live at `/benchmarks/` with four performance suites:**

| Suite | What it measures | Key metric |
|-------|-----------------|------------|
| **Initial Render** | Time from `vlist()` to first painted frame | Median (ms) |
| **Scroll FPS** | Sustained scroll rendering throughput over 5s | Avg FPS, Frame budget (ms) |
| **Memory** | Heap usage after render and after 10s of scrolling | Scroll delta (MB) |
| **scrollToIndex** | Latency of smooth `scrollToIndex()` animation | Median (ms) |

All suites run at three item counts: **10K**, **100K**, and **1M**.

Uses a decoupled multi-loop architecture (scroll driver via `setTimeout`, paint counter via rAF, cost probe via scroll event + rAF) to produce accurate measurements regardless of display refresh rate. Includes display throttling detection, JIT warmup phases, and adaptive rating thresholds.

See [benchmarks.md](./resources/benchmarks.md) for full documentation.

---

### 11. ✅ Auto-Height Measurement

**Priority:** Low (Phase 4 polish — requires variable heights first).

**Problem:** Even with Mode A (function-based heights), consumers must know heights upfront. Auto-measurement lets consumers provide just an estimate and vlist figures out the rest.

**Approach:**

```typescript
item: {
  estimatedHeight: 120,
  template: myTemplate,
  // vlist renders item, measures with ResizeObserver,
  // caches actual size, adjusts scroll position
}
```

**Implementation:** Shipped as Mode B. See [Auto-Size Measurement](../internals/measurement.md) for the full internals.

Summary:
- `MeasuredSizeCache` (`src/rendering/measured.ts`) wraps the variable `SizeCache` with a `Map<number, number>` of measured sizes. Unmeasured items fall back to the estimate; once measured, an item behaves identically to Mode A.
- Items are rendered unconstrained so the browser lays out at natural content height, then `ResizeObserver` records the real size and constrains the element.
- **Direction C scroll correction** — applied immediately per-batch in the `ResizeObserver` callback, even during active scrolling. Per-batch deltas are small and masked by the user's own scroll motion, so there is no visible jump.
- **Content size deferral** — `updateContentSize()` is deferred during scrolling to keep the scrollbar thumb stable, then flushed on scroll idle.
- **Stick-to-bottom** — if the user was at the scroll end before content size grew, the viewport snaps to the new maximum on flush.
- Works for both orientations: `estimatedHeight` (vertical) and `estimatedWidth` (horizontal).

**Source files:**
- `src/rendering/measured.ts` — `MeasuredSizeCache` (57 unit tests)
- `src/builder/core.ts` — config resolution, `ResizeObserver` wiring, scroll correction, content size deferral
- `src/types.ts` — `estimatedHeight` / `estimatedWidth` on `ItemConfig`
- `examples/auto-size/` — social feed demo (5,000 variable-height posts)

---

### 12. ✅ Enhanced Accessibility

**Priority:** Medium.

**Implemented — all WAI-ARIA Listbox gaps addressed:**

| Feature | Standard | Implementation |
|---------|----------|----------------|
| `aria-setsize` | WAI-ARIA Listbox | Set on every rendered item — screen readers announce "item 5 of 10,000" |
| `aria-posinset` | WAI-ARIA Listbox | 1-based position set on every rendered item |
| `aria-activedescendant` | WAI-ARIA Practices | Root element tracks the focused item by ID — better than roving tabindex for virtual lists since items are constantly recycled |
| `aria-busy` | WAI-ARIA | Set on root during async adapter loading, removed on completion |
| Live region | WAI-ARIA | Visually-hidden `aria-live="polite"` region announces selection changes ("3 items selected") |
| Unique element IDs | WAI-ARIA | Instance-scoped IDs (`vlist-{n}-item-{index}`) — safe with multiple lists on one page |

**Works across all modes:** list, grid, core, groups, reverse, compression.

**Bundle cost:** +1.4 KB minified (+0.4 KB gzipped).

**Test coverage:** 40 dedicated accessibility tests (`test/accessibility.test.ts`).

**Full documentation:** [accessibility.md]/tutorials/accessibility)

---

### 13. ✅ Scroll Position Save/Restore

**Priority:** Low.

**Problem:** When navigating away and returning (SPA route change, browser back), scroll position is lost.

**Solution:** Implemented `getScrollSnapshot()` and `restoreScroll(snapshot)` on both `VList` (full) and `VListCore` (standalone).

```typescript
// Save
const snapshot = list.getScrollSnapshot();
// { index: 523, offsetInItem: 12, selectedIds: [...] }
sessionStorage.setItem('list-scroll', JSON.stringify(snapshot));

// Restore
const saved = JSON.parse(sessionStorage.getItem('list-scroll'));
list.restoreScroll(saved);
```

**Key details:**
- `getScrollSnapshot()` captures the first visible item index, sub-pixel offset within that item, and optionally selected IDs
- `restoreScroll(snapshot)` scrolls to the exact position and optionally restores selection
- Works with fixed and variable item heights
- Works with compressed mode (1M+ items) — uses linear ratio mapping
- Groups mode: automatically converts between data indices and layout indices
- Grid mode: automatically converts between item indices and row indices
- Snapshots are plain objects — JSON-serializable for `sessionStorage` usage
- Round-trips perfectly (save → serialize → deserialize → restore)

---

## Priority Matrix

| # | Feature | Impact | Effort | Phase | Status |
|---|---------|--------|--------|-------|--------|
| 1 | Variable item heights (Mode A) | 🔴 Critical | Large | 1 | ✅ Done |
| 2 | Smooth scrollToIndex | 🟠 High | Small | 1 | ✅ Done |
| 3 | Shrink bundle size | 🟠 High | Medium | 1 | ✅ Done |
| 4 | Horizontal scrolling | 🟡 Medium | Medium | 2 | ✅ Done |
| 5 | Grid layout | 🟡 Medium | Medium-Large | 2 | ✅ Done |
| 6 | Window scrolling | 🟡 Medium | Medium | 2 | ✅ Done |
| 7 | Sticky headers | 🟡 Medium | Medium | 3 | ✅ Done |
| 8 | Reverse mode (chat) | 🟡 Medium | Medium-Large | 3 | ✅ Done |
| 9 | Framework adapters | 🟡 Medium | Small each | 3 | ✅ Done |
| 10 | Public benchmarks | 🟠 High | Medium | 4 | ✅ Done |
| 11 | Auto-height measurement | 🟢 Low | Medium | 4 | ✅ Done |
| 12 | Enhanced accessibility | 🟡 Medium | Small-Medium | 4 | ✅ Done |
| 13 | Scroll save/restore | 🟢 Low | Small | 4 | ✅ Done |
| 14 | Scroll config (wheel, scrollbar, wrap) | 🟡 Medium | Medium | 4 | ✅ Done |

**Summary: 14 of 14 features shipped.** All phases complete. The full roadmap is done.

---

## Remaining Optimization (from optimization.md)

| # | Item | Status |
|---|------|--------|
| Z1 | Deduplicate dark mode CSS | ⏸️ Deferred (gzip handles it) |
| Z3 | Lazy-init placeholder manager | ✅ Done (part of Issue #3) |

---

## Related Documentation

- [Auto-Size Measurement](../internals/measurement.md) — Full internals of Mode B: MeasuredSizeCache, ResizeObserver wiring, scroll correction, content size deferral
- [Optimization Guide](/tutorials/optimization) — Implemented performance optimizations
- [Main Documentation](/) — Configuration and usage
- [Scale Guide](../features/scale.md) — How 1M+ item compression works
- [Accessibility Guide](/tutorials/accessibility) — WAI-ARIA implementation, keyboard navigation, screen reader support
- [Benchmarks Guide](./benchmarks.md) — Performance suites, scroll FPS architecture, rating system
- [Styles Guide](/tutorials/styling) — CSS architecture

---

*Last updated: July 2025*
*Status: 14/14 shipped. All phases complete. Full roadmap done.*
