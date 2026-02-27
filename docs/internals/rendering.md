# Rendering Module

> DOM rendering, virtualization, and compression for vlist.

## Overview

The rendering module is responsible for all DOM-related operations in vlist. It handles:

- **Size Cache**: Efficient size management for fixed and variable item sizes (height or width depending on orientation)
- **DOM Structure**: Creating and managing the vlist DOM hierarchy (axis-aware, lives in `builder/dom.ts`)
- **Element Rendering**: Efficiently rendering items using an element pool with axis-aware positioning (pool lives in `builder/pool.ts`)
- **Virtual Scrolling**: Calculating visible ranges and viewport state
- **Compression**: Handling large lists (1M+ items) that exceed browser limits

## Module Structure

```
src/rendering/
├── index.ts        # Module exports
├── sizes.ts        # Size cache for fixed and variable item sizes (axis-neutral)
├── measured.ts     # Measured size cache for auto-size measurement (Mode B)
├── renderer.ts     # DOM rendering with compression support (axis-aware)
├── viewport.ts     # Virtual scrolling calculations and viewport state
└── scale.ts        # Large list compression logic (1M+ items)
```

Related modules in `builder/`:

```
src/builder/
├── dom.ts          # DOM structure, container resolution (axis-aware)
├── pool.ts         # Element pool for DOM element recycling
└── ...
```

> **Shared modules:** `sizes.ts` has zero dependencies on compression or other heavy vlist internals. DOM structure (`builder/dom.ts`) and element pooling (`builder/pool.ts`) are shared by both the full `vlist` builder and the lightweight `vlist/core` entry point, eliminating code duplication while preserving tree-shaking.

---

## Size Cache (`sizes.ts`, `measured.ts`)

The `SizeCache` abstraction enables fixed, variable, and measured item sizes throughout the rendering pipeline. All virtual scrolling and compression functions accept a `SizeCache` instead of a raw `itemSize: number`.

**Three implementations:**

| Implementation | When | Offset Lookup | Index Search | Overhead |
|----------------|------|---------------|--------------|----------|
| **Fixed** | `size: number` | O(1) multiplication | O(1) division | Zero — identical to pre-variable-size code |
| **Variable** | `size: (index) => number` | O(1) prefix-sum lookup | O(log n) binary search | Prefix-sum array rebuilt on data changes |
| **Measured** | `estimatedHeight: number` | O(1) prefix-sum lookup | O(log n) binary search | Same as Variable + Map lookup for measured sizes |

```typescript
import { createSizeCache, type SizeCache } from 'vlist';

// Fixed — zero overhead fast path
const fixed = createSizeCache(48, totalItems);
fixed.getOffset(10);      // 480  (10 × 48)
fixed.indexAtOffset(480);  // 10   (480 / 48)
fixed.getTotalSize();      // totalItems × 48

// Variable — prefix-sum based
const variable = createSizeCache(
  (index) => index % 2 === 0 ? 40 : 80,
  totalItems
);
variable.getOffset(2);      // 120  (40 + 80)
variable.indexAtOffset(100); // 1   (binary search)
variable.getTotalSize();     // sum of all sizes
```

**SizeCache interface:**

```typescript
interface SizeCache {
  getOffset(index: number): number;      // Position of item — O(1)
  getSize(index: number): number;        // Size of specific item
  indexAtOffset(offset: number): number;  // Item at scroll position — O(1) fixed, O(log n) variable
  getTotalSize(): number;                // Total content size
  getTotal(): number;                    // Current item count
  rebuild(totalItems: number): void;     // Rebuild after data changes
  isVariable(): boolean;                 // Fixed vs variable
}
```

The **Measured** implementation (`measured.ts`) wraps a Variable cache with a `Map<number, number>` of measured sizes. Unmeasured items fall back to the estimated size. Once measured, an item behaves identically to a variable-size item. See [Measurement](./measurement.md) for full details on `ResizeObserver` wiring, scroll correction, and content size deferral.

**Helper functions** (used internally by compression):

- `countVisibleItems(cache, startIndex, containerSize, totalItems)` — How many items fit in a viewport
- `countItemsFittingFromBottom(cache, containerSize, totalItems)` — How many items fit from list end
- `getOffsetForVirtualIndex(cache, virtualIndex, totalItems)` — Pixel offset for fractional index (compressed mode)

---

## DOM Structure

vlist creates a specific DOM hierarchy for virtual scrolling:

```html
<div class="vlist" role="listbox" tabindex="0">
  <div class="vlist-viewport" style="overflow: auto; height: 100%;">
    <div class="vlist-content" style="position: relative; height: {totalSize}px;">
      <div class="vlist-items" style="position: relative;">
        <!-- Rendered items appear here -->
        <div class="vlist-item" data-index="0" style="transform: translateY(0px);">...</div>
        <div class="vlist-item" data-index="1" style="transform: translateY(48px);">...</div>
      </div>
    </div>
  </div>
</div>
```

---

## Element Pooling

The renderer uses an element pool to recycle DOM elements, reducing garbage collection and improving performance:

```typescript
interface ElementPool {
  acquire: () => HTMLElement;   // Get element from pool (or create new)
  release: (element: HTMLElement) => void;  // Return element to pool
  clear: () => void;            // Clear the pool
  stats: () => { poolSize: number; created: number; reused: number };
}
```

When acquiring elements, the pool also sets the static `role="option"` attribute once per element lifetime, avoiding repeated `setAttribute` calls during rendering.

---

## Rendering Optimizations

### DocumentFragment Batching

When rendering new items, the renderer collects them in a `DocumentFragment` and appends them in a single DOM operation. This reduces layout thrashing during fast scrolling.

### Optimized Attribute Setting

The renderer uses `dataset` and direct property assignment instead of `setAttribute` for better performance:

```typescript
// Fast: direct property assignment
element.dataset.index = String(index);
element.dataset.id = String(item.id);
element.ariaSelected = String(isSelected);
```

### CSS Containment

The renderer applies CSS containment for optimized compositing:

- **Items container**: `contain: layout style` — tells the browser that layout and style changes inside the container don't affect elements outside it
- **Individual items**: `contain: content` + `will-change: transform` — enables the browser to treat each item as an independent compositing layer, improving scroll performance

These are applied via the `.vlist-items` and `.vlist-item` CSS classes respectively.

### CSS-Only Static Positioning

Item static styles (`position: absolute; top: 0; left: 0; right: 0`) are defined purely in the `.vlist-item` CSS class rather than set via JavaScript `style.cssText`. Only the dynamic `height` property is set via JS. This eliminates per-element CSS string parsing during rendering.

### Reusable ItemState

The `ItemState` object passed to templates is reused to reduce GC pressure:

```typescript
const reusableItemState: ItemState = { selected: false, focused: false };

const getItemState = (isSelected: boolean, isFocused: boolean): ItemState => {
  reusableItemState.selected = isSelected;
  reusableItemState.focused = isFocused;
  return reusableItemState;
};
```

**⚠️ Important**: Templates should read from the state object immediately and not store the reference, as it will be mutated on the next render call.

---

## Virtual Scrolling

Only items within the visible range (plus overscan buffer) are rendered:

```
Total: 10,000 items
Visible: items 150-165 (16 items)
Overscan: 3
Rendered: items 147-168 (22 items)
```

When a list exceeds browser size limits (~16.7M pixels), compression automatically activates. See [Scale](../features/scale.md) for details.

---

## API Reference

### DOM Structure (`dom.ts`)

> These utilities live in `src/builder/dom.ts` — a standalone module with zero dependencies on compression or other vlist internals. Shared by both the full renderer and `vlist/core`.

#### createDOMStructure

Creates the vlist DOM hierarchy.

```typescript
function createDOMStructure(
  container: HTMLElement,
  classPrefix: string
): DOMStructure;

interface DOMStructure {
  root: HTMLElement;      // Root vlist element
  viewport: HTMLElement;  // Scrollable container
  content: HTMLElement;   // Size-setting element
  items: HTMLElement;     // Items container
}
```

#### resolveContainer

Resolves a container from selector or element.

```typescript
function resolveContainer(container: HTMLElement | string): HTMLElement;
```

#### getContainerDimensions

Gets viewport dimensions.

```typescript
function getContainerDimensions(viewport: HTMLElement): {
  width: number;
  height: number;
};
```

#### updateContentHeight / updateContentWidth

Updates the content size for virtual scrolling along the main axis.

```typescript
function updateContentHeight(content: HTMLElement, totalSize: number): void;
function updateContentWidth(content: HTMLElement, totalSize: number): void;
```

---

### Element Pool (`pool.ts`)

> Lives in `src/builder/pool.ts` — a standalone module shared by both the full renderer and `vlist/core`.

#### createElementPool

Creates an element pool for recycling DOM elements.

```typescript
function createElementPool(
  tagName?: string,  // default: "div"
): ElementPool;

interface ElementPool {
  acquire: () => HTMLElement;
  release: (element: HTMLElement) => void;
  clear: () => void;
  stats: () => { poolSize: number; created: number; reused: number };
}
```

---

### Renderer (`renderer.ts`)

#### createRenderer

Creates a renderer instance for managing DOM elements.

```typescript
function createRenderer<T extends VListItem>(
  itemsContainer: HTMLElement,
  template: ItemTemplate<T>,
  sizeCache: SizeCache,
  classPrefix: string,
  totalItemsGetter?: () => number,
  ariaIdPrefix?: string,
  horizontal?: boolean,
  crossAxisSize?: number,
  compressionFns?: {
    getState: CompressionStateFn;
    getPosition: CompressedPositionFn;
  }
): Renderer<T>;

interface Renderer<T extends VListItem> {
  render: (
    items: T[],
    range: Range,
    selectedIds: Set<string | number>,
    focusedIndex: number,
    compressionCtx?: CompressionContext
  ) => void;
  updatePositions: (compressionCtx: CompressionContext) => void;
  updateItem: (index: number, item: T, isSelected: boolean, isFocused: boolean) => void;
  updateItemClasses: (index: number, isSelected: boolean, isFocused: boolean) => void;
  getElement: (index: number) => HTMLElement | undefined;
  clear: () => void;
  destroy: () => void;
}
```

The renderer accepts a `SizeCache` instead of a plain `itemHeight: number`, enabling variable and measured sizes. The optional `compressionFns` parameter injects compressed positioning and compression state functions — when not provided, the renderer assumes no compression.

#### CompressionContext

Context for positioning items in compressed mode.

```typescript
interface CompressionContext {
  scrollPosition: number;
  totalItems: number;
  containerSize: number;
  rangeStart: number;
}
```

---

### Virtual Scrolling (`viewport.ts`)

#### createViewportState

Creates initial viewport state.

```typescript
function createViewportState(
  containerSize: number,
  sizeCache: SizeCache,
  totalItems: number,
  overscan: number,
  compression: CompressionState,
  visibleRangeFn?: VisibleRangeFn
): ViewportState;

interface ViewportState {
  scrollPosition: number;       // Current scroll offset along main axis
  containerSize: number;        // Container size along main axis
  totalSize: number;            // Virtual size (may be capped at MAX_VIRTUAL_SIZE)
  actualSize: number;           // True size without compression
  isCompressed: boolean;        // Whether compression is active
  compressionRatio: number;     // 1 = no compression, <1 = compressed
  visibleRange: Range;          // Visible item range
  renderRange: Range;           // Rendered range (includes overscan)
}
```

#### updateViewportState

Updates viewport state after scroll. Mutates state in place for performance on the scroll hot path.

```typescript
function updateViewportState(
  state: ViewportState,
  scrollPosition: number,
  sizeCache: SizeCache,
  totalItems: number,
  overscan: number,
  compression: CompressionState,
  visibleRangeFn?: VisibleRangeFn
): ViewportState;
```

#### updateViewportSize

Updates viewport state when container resizes.

```typescript
function updateViewportSize(
  state: ViewportState,
  containerSize: number,
  sizeCache: SizeCache,
  totalItems: number,
  overscan: number,
  compression: CompressionState,
  visibleRangeFn?: VisibleRangeFn
): ViewportState;
```

#### updateViewportItems

Updates viewport state when total items changes.

```typescript
function updateViewportItems(
  state: ViewportState,
  sizeCache: SizeCache,
  totalItems: number,
  overscan: number,
  compression: CompressionState,
  visibleRangeFn?: VisibleRangeFn
): ViewportState;
```

#### simpleVisibleRange

Calculate visible range using size cache lookups. Fast path for lists that don't need compression. Mutates `out` to avoid allocation on the scroll hot path.

```typescript
const simpleVisibleRange: VisibleRangeFn;
// (scrollPosition, containerSize, sizeCache, totalItems, compression, out) => Range
```

#### calculateRenderRange

Calculate render range (adds overscan around visible range). Compression-agnostic. Mutates `out`.

```typescript
function calculateRenderRange(
  visibleRange: Range,
  overscan: number,
  totalItems: number,
  out: Range
): Range;
```

#### calculateScrollToIndex

Calculate scroll position to bring an index into view.

```typescript
function calculateScrollToIndex(
  index: number,
  sizeCache: SizeCache,
  containerSize: number,
  totalItems: number,
  align: 'start' | 'center' | 'end',
  compression: CompressionState,
  scrollToIndexFn?: ScrollToIndexFn
): number;
```

---

### Range Utilities

```typescript
// Check if two ranges are equal
function rangesEqual(a: Range, b: Range): boolean;

// Check if index is within range
function isInRange(index: number, range: Range): boolean;

// Get count of items in range
function getRangeCount(range: Range): number;

// Create an array of indices from a range
function rangeToIndices(range: Range): number[];

// Calculate which indices need to be added/removed when range changes
function diffRanges(oldRange: Range, newRange: Range): {
  add: number[];
  remove: number[];
};

// Clamp scroll position to valid range
function clampScrollPosition(
  scrollPosition: number,
  totalSize: number,
  containerSize: number
): number;

// Determine scroll direction
function getScrollDirection(
  currentPosition: number,
  previousPosition: number
): 'up' | 'down';

// Calculate total content size (uses compression's virtualSize when compressed)
function calculateTotalSize(
  totalItems: number,
  sizeCache: SizeCache,
  compression?: CompressionState | null
): number;

// Calculate actual total size (without compression cap)
function calculateActualSize(
  totalItems: number,
  sizeCache: SizeCache
): number;

// Calculate the offset (translateY/X) for an item (non-compressed)
function calculateItemOffset(
  index: number,
  sizeCache: SizeCache
): number;
```

---

### Compression (`scale.ts`)

#### getCompressionState

Calculate compression state for a list.

```typescript
function getCompressionState(
  totalItems: number,
  sizeCache: SizeCache
): CompressionState;

interface CompressionState {
  isCompressed: boolean;
  actualSize: number;     // True total size (uncompressed)
  virtualSize: number;    // Capped at MAX_VIRTUAL_SIZE
  ratio: number;          // virtualSize / actualSize
}
```

#### Compression Constants

```typescript
// Maximum virtual size along the main axis (16M pixels)
const MAX_VIRTUAL_SIZE = 16_000_000;

// Deprecated alias — use MAX_VIRTUAL_SIZE
const MAX_VIRTUAL_HEIGHT = MAX_VIRTUAL_SIZE;
```

#### Compressed Range Calculations

```typescript
// Calculate visible range with compression
function calculateCompressedVisibleRange(
  scrollPosition: number,
  containerSize: number,
  sizeCache: SizeCache,
  totalItems: number,
  compression: CompressionState,
  out: Range
): Range;

// Calculate item position with compression
function calculateCompressedItemPosition(
  index: number,
  scrollPosition: number,
  sizeCache: SizeCache,
  totalItems: number,
  containerSize: number,
  compression: CompressionState,
  rangeStart?: number
): number;

// Calculate scroll position for an index with compression
function calculateCompressedScrollToIndex(
  index: number,
  sizeCache: SizeCache,
  containerSize: number,
  totalItems: number,
  compression: CompressionState,
  align?: 'start' | 'center' | 'end'
): number;
```

---

## Usage Examples

### Basic Rendering

```typescript
import { createRenderer, createDOMStructure } from './render';
import { createSizeCache } from './rendering/sizes';

// Create DOM structure
const dom = createDOMStructure(container, 'vlist');

// Create size cache
const sizeCache = createSizeCache(48, totalItems);

// Create renderer
const renderer = createRenderer(
  dom.items,
  (item, index, state) => `<div>${item.name}</div>`,
  sizeCache,
  'vlist'
);

// Render items
renderer.render(
  items,
  { start: 0, end: 20 },
  new Set(),  // selected IDs
  -1          // focused index
);
```

### Viewport State Management

```typescript
import { createViewportState, updateViewportState } from './rendering/viewport';
import { createSizeCache } from './rendering/sizes';
import { getSimpleCompressionState } from './rendering/viewport';

const sizeCache = createSizeCache(48, 1000);
const compression = getSimpleCompressionState(1000, sizeCache);

// Create initial state
let viewport = createViewportState(
  600,         // containerSize
  sizeCache,
  1000,        // totalItems
  3,           // overscan
  compression
);

// Update on scroll
viewport = updateViewportState(
  viewport,
  240,         // scrollPosition
  sizeCache,
  1000,        // totalItems
  3,           // overscan
  compression
);

console.log(viewport.visibleRange); // { start: 5, end: 17 }
console.log(viewport.renderRange);  // { start: 2, end: 20 }
```

### Compression Detection

```typescript
import { getCompressionState } from './rendering/scale';
import { createSizeCache } from './rendering/sizes';

const sizeCache = createSizeCache(48, 1_000_000);
const compression = getCompressionState(1_000_000, sizeCache);

console.log(compression.isCompressed);  // true
console.log(compression.ratio);         // 0.333...
console.log(compression.actualSize);    // 48,000,000
console.log(compression.virtualSize);   // 16,000,000
```

---

## Performance Considerations

### Element Pooling

- Elements are reused instead of created/destroyed
- Reduces DOM operations and garbage collection
- `role="option"` is set once per element lifetime in the pool, not per render
- Pool release uses `textContent = ""` instead of `innerHTML = ""` (avoids HTML parser invocation)

### Viewport State Mutation

For performance on the scroll hot path, viewport state is **mutated in place** rather than creating new objects:

```typescript
// updateViewportState mutates state directly
state.scrollPosition = scrollPosition;
state.visibleRange.start = start;
state.visibleRange.end = end;
```

### In-Place Range Mutation

`simpleVisibleRange` and `calculateRenderRange` accept an `out` parameter to mutate existing range objects, avoiding allocation of new `Range` objects on every scroll frame:

```typescript
// Zero-allocation: mutate existing range
simpleVisibleRange(scrollPosition, containerSize, sizeCache, totalItems, compression, existingRange);
```

### CSS Optimization

- **CSS containment**: `contain: layout style` on items container, `contain: content` + `will-change: transform` on items for optimized compositing
- Static positioning (`position: absolute; top: 0; left: 0; right: 0`) defined in `.vlist-item` CSS class — only dynamic size set via JS
- Only `transform` is updated on scroll (GPU-accelerated)
- Class toggles use `classList.toggle()` for efficiency
- **Scroll transition suppression**: `.vlist--scrolling` class is toggled during active scroll to disable CSS transitions, re-enabled on idle

---

## Related

- [Measurement](./measurement.md) — Auto-size measurement (Mode B): MeasuredSizeCache, ResizeObserver wiring, scroll correction
- [Scale](../features/scale.md) — Detailed compression documentation
- [Scrollbar](../features/scrollbar.md) — Scroll controller
- [Context](./context.md) — BuilderContext that holds renderer reference and wires event handlers
- [Orientation](./orientation.md) — How the axis-neutral SizeCache enables both vertical and horizontal scrolling
- [Structure](./structure.md) — Complete source code map

---

*This module is the core of vlist's virtual scrolling implementation.*