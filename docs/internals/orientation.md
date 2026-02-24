# Orientation

> How vlist uses a single code path for both vertical and horizontal scrolling — and why every internal API speaks "size" and "position" instead of "height" and "scrollTop".

## The Problem

Virtual scrolling libraries are traditionally built around vertical assumptions. Variable names say `height`, `scrollTop`, `translateY`, `deltaY`. The math is correct — but it's locked to one axis.

When horizontal scrolling is added (carousels, timelines, horizontal menus), every function that says `height` is now sometimes returning a width. Every `scrollTop` is sometimes a `scrollLeft`. The code becomes a minefield of semantic lies:

```typescript
// Confusing: getHeight() returns width in horizontal mode
const offset = heightCache.getHeight(index);  // ← is this a height or a width?
const pos = viewport.scrollTop;               // ← this is actually scrollLeft
const total = viewport.totalHeight;           // ← this is actually totalWidth
```

The problem compounds across every layer — size cache, viewport state, compression, rendering, scroll controller, events. A single semantic inconsistency multiplies into hundreds of confusing references.

## The Solution: Axis-Neutral Vocabulary

vlist solves this with a two-layer architecture:

1. **Core layer** — All virtualization math uses axis-neutral terms: `size`, `offset`, `position`, `containerSize`, `totalSize`. These functions don't know or care which axis they're operating on.

2. **DOM layer** — A thin translation layer at the edges maps axis-neutral values to axis-specific DOM properties (`translateX` vs `translateY`, `scrollLeft` vs `scrollTop`, `width` vs `height`).

The boundary between the two layers is a single boolean: `isHorizontal`.

```
┌─────────────────────────────────────────────────────────┐
│                      DOM Layer                          │
│  translateX / translateY                                │
│  scrollLeft / scrollTop                                 │
│  element.style.width / element.style.height             │
│  overflowX / overflowY                                  │
│  deltaX / deltaY                                        │
│  aria-orientation="horizontal" / (default vertical)     │
├─────────────────────────────────────────────────────────┤
│              isHorizontal (single boolean)               │
├─────────────────────────────────────────────────────────┤
│                     Core Layer                          │
│  SizeCache: getSize(), getOffset(), getTotalSize()      │
│  ViewportState: scrollPosition, containerSize, totalSize│
│  CompressionState: actualSize, virtualSize, ratio       │
│  Range: { start, end }                                  │
│  Functions: simpleVisibleRange(), calculateRenderRange() │
│  Events: { scrollPosition, ... }                        │
└─────────────────────────────────────────────────────────┘
```

## Core Layer: The SizeCache

The `SizeCache` is the foundational abstraction. It manages item sizes along the **main axis** — height for vertical lists, width for horizontal lists — without knowing which one it is.

```typescript
interface SizeCache {
  getOffset(index: number): number;     // position along main axis
  getSize(index: number): number;       // size of item (height or width)
  indexAtOffset(offset: number): number; // which item is at this position
  getTotalSize(): number;               // total content size
  getTotal(): number;                   // item count
  rebuild(totalItems: number): void;    // rebuild after data change
  isVariable(): boolean;                // fixed vs variable fast path
}
```

Two implementations share this interface:

| Implementation | When | Complexity | How |
|---------------|------|------------|-----|
| **Fixed** | `item.height: 48` or `item.width: 200` | O(1) everything | Pure multiplication: `offset = index * size` |
| **Variable** | `item.height: (i) => sizes[i]` | O(1) offset, O(log n) search | Prefix-sum array with binary search |

The factory picks the right one:

```typescript
const createSizeCache = (
  size: number | ((index: number) => number),
  initialTotal: number,
): SizeCache => {
  if (typeof size === "number") {
    return createFixedSizeCache(size, initialTotal);
  }
  return createVariableSizeCache(size, initialTotal);
};
```

Every module that needs item sizes — viewport calculations, compression, grid layout, sections, snapshots — depends only on `SizeCache`. None of them import anything axis-specific.

## Core Layer: ViewportState

The viewport state tracks scroll position and content dimensions using axis-neutral names:

```typescript
interface ViewportState {
  scrollPosition: number;   // scrollTop or scrollLeft
  containerSize: number;    // container height or width
  totalSize: number;        // content size (may be compressed)
  actualSize: number;       // content size (uncompressed)
  isCompressed: boolean;
  compressionRatio: number;
  visibleRange: Range;      // { start, end }
  renderRange: Range;       // { start, end } (includes overscan)
}
```

All viewport functions — `simpleVisibleRange`, `calculateRenderRange`, `updateViewportState`, `calculateScrollToIndex` — accept and return these neutral types. They perform pure math on numbers without any DOM awareness.

## Core Layer: CompressionState

The compression system (for 1M+ item lists that exceed browser height limits) is also axis-neutral:

```typescript
interface CompressionState {
  isCompressed: boolean;
  actualSize: number;    // real total size (could be millions of pixels)
  virtualSize: number;   // capped size (fits browser limits)
  ratio: number;         // virtualSize / actualSize
}
```

Whether you're compressing a very tall vertical list or a very wide horizontal carousel, the math is identical.

## DOM Layer: The Translation Boundary

The `isHorizontal` boolean is resolved once at creation time from the config:

```typescript
const isHorizontal = config.orientation === 'horizontal';
const mainAxisProp = isHorizontal ? 'width' : 'height';
const mainAxisValue = isHorizontal ? config.item.width : config.item.height;
```

From that point, every axis-specific operation is a simple conditional at the DOM boundary. These conditionals are concentrated in a small number of places:

### 1. DOM Structure (`builder/dom.ts`)

```typescript
// Viewport scrolling axis
if (horizontal) {
  viewport.style.overflowX = 'auto';
  viewport.style.overflowY = 'hidden';
} else {
  viewport.style.overflow = 'auto';
}

// Content sizing
if (horizontal) {
  content.style.height = '100%';    // cross-axis fills container
} else {
  content.style.width = '100%';     // cross-axis fills container
}

// ARIA
if (horizontal) root.setAttribute('aria-orientation', 'horizontal');
```

### 2. Scroll Reading (`builder/core.ts`)

```typescript
// Read scroll position from DOM — resolved once into a function pointer
const getScrollTop = isHorizontal
  ? () => dom.viewport.scrollLeft
  : () => dom.viewport.scrollTop;

// Write scroll position to DOM
const setScrollTop = isHorizontal
  ? (pos: number) => { dom.viewport.scrollLeft = pos; }
  : (pos: number) => { dom.viewport.scrollTop = pos; };
```

### 3. Item Positioning (`builder/core.ts`)

```typescript
const positionElement = (element: HTMLElement, index: number): void => {
  const offset = Math.round(sizeCache.getOffset(index));
  if (isHorizontal) {
    element.style.transform = `translateX(${offset}px)`;
  } else {
    element.style.transform = `translateY(${offset}px)`;
  }
};
```

### 4. Item Sizing (`builder/core.ts`)

```typescript
if (isHorizontal) {
  element.style.width = `${sizeCache.getSize(index)}px`;    // main axis
  if (crossAxisSize) element.style.height = `${crossAxisSize}px`;
} else {
  element.style.height = `${sizeCache.getSize(index)}px`;   // main axis
}
```

### 5. Content Size Update (`builder/core.ts`)

```typescript
const updateContentSize = (): void => {
  const size = `${sizeCache.getTotalSize()}px`;
  if (isHorizontal) {
    dom.content.style.width = size;
  } else {
    dom.content.style.height = size;
  }
};
```

### 6. Container Size Reading (`builder/core.ts`)

```typescript
const containerSize = isHorizontal ? containerWidth : containerHeight;
```

That's it. Six points of axis translation. Everything else — the entire virtualization engine, compression system, range calculations, event system, feature plugins — operates in axis-neutral space.

## How Features Stay Axis-Neutral

Every feature plugin (`withScale`, `withSections`, `withGrid`, `withAsync`, `withSelection`, `withSnapshots`, `withScrollbar`) interacts with the core through the `BuilderContext`, which exposes only axis-neutral primitives:

```typescript
// Features access these — all axis-neutral
ctx.sizeCache           // SizeCache (getSize, getOffset, getTotalSize)
ctx.viewportState       // ViewportState (scrollPosition, containerSize)
ctx.compressionState    // CompressionState (actualSize, virtualSize)
ctx.resolvedConfig      // { horizontal: boolean } — for the rare feature that needs it
```

Features that need to do DOM work (like `withScrollbar` rendering a thumb along the correct edge, or `withSections` positioning a sticky header) check `ctx.resolvedConfig.horizontal` at their own DOM boundary — keeping the same pattern of axis-neutral math with thin DOM translation.

## The Naming Convention

The axis-neutral vocabulary follows a consistent pattern:

| Concept | Axis-Neutral Name | Vertical DOM | Horizontal DOM |
|---------|-------------------|-------------|----------------|
| Item dimension (main axis) | `size` | `height` | `width` |
| Item dimension (cross axis) | `crossAxisSize` | `width` | `height` |
| Position along main axis | `offset` | `top` offset | `left` offset |
| Scroll position | `scrollPosition` | `scrollTop` | `scrollLeft` |
| Container dimension | `containerSize` | `clientHeight` | `clientWidth` |
| Total content | `totalSize` | total height | total width |
| CSS transform | (resolved at DOM) | `translateY` | `translateX` |
| Wheel delta | (resolved at DOM) | `deltaY` | `deltaX` |
| Overflow | (resolved at DOM) | `overflow-y` | `overflow-x` |

This naming convention is enforced everywhere in the core layer. No function in `rendering/`, `features/`, or `builder/` (except DOM-boundary code) uses terms like `height`, `scrollTop`, or `translateY`.

## Why This Matters

### 1. Single Code Path

The virtualization math is written once and works for both orientations. There's no `if (horizontal)` scattered through range calculations, compression logic, or prefix-sum lookups. When a bug is fixed in the core, it's fixed for both axes.

### 2. Zero Overhead

The `isHorizontal` boolean is resolved once at creation time. The scroll getter is resolved to a function pointer once. There are no per-frame orientation checks on the hot path. The axis-specific branches exist only in DOM-touching code, which is already branching on element properties.

### 3. Features Compose Freely

Because features interact with axis-neutral APIs, they work in horizontal mode without any horizontal-specific code. `withScale` compresses a wide carousel the same way it compresses a tall list. `withSnapshots` saves and restores scroll position regardless of axis. `withAsync` triggers loading based on `scrollPosition` approaching `totalSize` — works identically for both.

### 4. Testable in Isolation

The core layer functions are pure math — they take numbers and return numbers. Tests don't need a DOM, don't need to set up horizontal vs vertical scenarios separately for the math layer. The 1,578 tests cover the core logic once, and the DOM translation is tested separately with much simpler assertions.

### 5. Future-Proof

If a third axis or mixed-mode scrolling were ever needed (e.g., a 2D panning view), the core layer wouldn't change. Only the DOM translation boundary would expand.

## Concrete Example: Full Vertical vs Horizontal Flow

**Vertical list** (`orientation: 'vertical'`, `item.height: 48`):

```
Config:  item.height = 48
         ↓
Builder: mainAxisValue = config.item.height = 48
         isHorizontal = false
         ↓
SizeCache: createSizeCache(48, 1000)
           getSize(5) → 48
           getOffset(5) → 240
           getTotalSize() → 48000
         ↓
Viewport: scrollPosition = dom.viewport.scrollTop
          containerSize = dom.viewport.clientHeight
         ↓
Range:   simpleVisibleRange(scrollPosition, containerSize, sizeCache, ...)
         → { start: 10, end: 22 }
         ↓
Render:  element.style.transform = `translateY(${offset}px)`
         element.style.height = `${size}px`
         dom.content.style.height = `${totalSize}px`
```

**Horizontal carousel** (`orientation: 'horizontal'`, `item.width: 200`):

```
Config:  item.width = 200
         ↓
Builder: mainAxisValue = config.item.width = 200
         isHorizontal = true
         ↓
SizeCache: createSizeCache(200, 1000)
           getSize(5) → 200
           getOffset(5) → 1000
           getTotalSize() → 200000
         ↓
Viewport: scrollPosition = dom.viewport.scrollLeft
          containerSize = dom.viewport.clientWidth
         ↓
Range:   simpleVisibleRange(scrollPosition, containerSize, sizeCache, ...)
         → { start: 3, end: 8 }
         ↓
Render:  element.style.transform = `translateX(${offset}px)`
         element.style.width = `${size}px`
         dom.content.style.width = `${totalSize}px`
```

The middle four steps (`SizeCache` → `Viewport` → `Range` → core render math) are **identical code**. Only the config reading at the top and the DOM writing at the bottom differ.

## Source Files

| File | Role |
|------|------|
| `src/rendering/sizes.ts` | `SizeCache` interface and implementations (fixed + variable) |
| `src/rendering/viewport.ts` | `ViewportState`, `CompressionState`, range calculations |
| `src/builder/core.ts` | Builder with `isHorizontal` resolution and DOM translation |
| `src/builder/dom.ts` | DOM structure creation with axis-aware layout |
| `src/types.ts` | `ViewportState`, `VListConfig.orientation`, `ItemConfig` |

## Related Documentation

- [Height-to-Size Refactoring](../refactoring/height-to-size-refactoring.md) — The commit-by-commit story of how this architecture was built
- [Rendering Internals](./rendering.md) — DOM rendering and virtualization
- [Structure](./structure.md) — Complete source code map
- [Variable Heights Implementation](../issues/variable-heights-implementation.md) — How `SizeCache` handles variable item sizes