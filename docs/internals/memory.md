# Memory Efficiency

> How vlist achieves 98-99% lower memory usage than competing virtual list libraries

## Overview

vlist uses **0.02 MB** of memory for virtualizing large lists, compared to competitors that use 0.29 MB to 24.51 MB. This represents a **98-99% reduction** in memory consumption while maintaining comparable or better performance.

This document explains the architectural decisions and implementation techniques that make this possible.

## Benchmark Comparison

Real-world memory usage for virtualizing 10,000 items:

| Library | Memory | vs vlist | Ecosystem |
|---------|--------|----------|-----------|
| **vlist** | **0.02 MB** | 1× | Vanilla JS |
| react-window | 0.29 MB | 14.5× | React |
| TanStack Virtual | 0.76 MB | 38× | React |
| vue-virtual-scroller | 1.23 MB | 61.5× | Vue |
| Legend List | 3.29 MB | 164.5× | React |
| Virtua | 24.51 MB | 1,225× | React |

## Core Principles

vlist achieves minimal memory usage through five key principles:

1. **Zero Framework Overhead** - Pure vanilla JavaScript with no runtime dependencies
2. **Object Reuse** - Mutate existing objects instead of allocating new ones
3. **DOM Element Pooling** - Recycle elements instead of creating/destroying
4. **Efficient Data Structures** - Minimal state with optimal representations
5. **Tree-Shakeable Features** - Pay only for what you use

## 1. Zero Framework Overhead

### The Problem with Frameworks

Framework-based virtual lists carry significant memory overhead from the framework runtime:

**React overhead includes:**
- Component instances and fiber nodes
- Virtual DOM tree
- Reconciliation data structures
- Hooks state (useState, useEffect, useRef, etc.)
- Context providers and consumers
- Event handler references
- Props and children objects

**Vue overhead includes:**
- Reactivity system (proxies, dep tracking)
- Computed property caches
- Watcher instances
- Template compilation artifacts
- Component lifecycle management

**SolidJS overhead includes:**
- Signal graph and subscriptions
- Reactive computations
- Memo caches
- Effect tracking

### vlist's Approach

vlist is pure vanilla JavaScript with zero runtime dependencies:

```typescript
// vlist/src/index.ts - Pure exports
export { vlist } from "./builder";
export { withScale, withAsync, withScrollbar } from "./features";
export type { VListItem, VListEvents, VListConfig } from "./types";
```

**No framework runtime = No framework overhead.**

All state management, rendering, and DOM manipulation is done with plain JavaScript objects and functions.

## 2. Object Reuse & In-Place Mutation

### The Problem with Immutability

Framework-based solutions often favor immutability, creating new objects on every update:

```typescript
// React example - new objects on every scroll
function useVirtualList() {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [renderRange, setRenderRange] = useState({ start: 0, end: 25 });
  
  const handleScroll = () => {
    // New objects allocated every scroll frame!
    setVisibleRange({ start: newStart, end: newEnd });
    setRenderRange({ start: renderStart, end: renderEnd });
  };
}
```

At 60fps scrolling, this creates **120 new objects per second** just for range tracking.

### vlist's Approach

vlist reuses objects and mutates them in place on hot paths:

```typescript
// vlist/src/builder/core.ts [L402-404]
// Reusable range objects (no allocation on scroll)
const visibleRange: Range = { start: 0, end: 0 };
const renderRange: Range = { start: 0, end: 0 };
const lastRenderRange: Range = { start: -1, end: -1 };
```

These objects are mutated in place during scroll:

```typescript
// vlist/src/rendering/viewport.ts
export const updateViewportState = (
  state: ViewportState,
  scrollPosition: number,
  sizeCache: SizeCache,
  totalItems: number,
  overscan: number,
  compression: CompressionState,
  visibleRangeFn: VisibleRangeFn = simpleVisibleRange,
): ViewportState => {
  // Mutate existing range objects - zero allocation
  visibleRangeFn(
    scrollPosition,
    state.containerSize,
    sizeCache,
    totalItems,
    compression,
    state.visibleRange,  // ← Mutated in place
  );
  
  calculateRenderRange(
    state.visibleRange,
    overscan,
    totalItems,
    state.renderRange,  // ← Mutated in place
  );

  state.scrollPosition = scrollPosition;  // ← Direct mutation
  return state;
};
```

**Result**: Zero allocations during scroll = Zero GC pressure.

### Minimal Shared State

All mutable state lives in a single shared object:

```typescript
// vlist/src/builder/core.ts [L407-422]
const sharedState: BuilderState = {
  viewportState: {
    scrollPosition: 0,
    containerSize: isHorizontal ? $.cw : $.ch,
    totalSize: $.hc.getTotalSize(),
    actualSize: $.hc.getTotalSize(),
    isCompressed: false,
    compressionRatio: 1,
    visibleRange: { start: 0, end: 0 },
    renderRange: { start: 0, end: 0 },
  },
  lastRenderRange: { start: -1, end: -1 },
  isInitialized: false,
  isDestroyed: false,
  cachedCompression: null,
};
```

This is **all the state** vlist needs for virtual scrolling. Compare this to a React component's accumulated state across multiple hooks, refs, and context.

## 3. DOM Element Pooling

### The Problem with DOM Creation

Creating and destroying DOM elements is expensive in terms of both CPU and memory:

```typescript
// Naive approach - creates new elements every scroll
function renderItems(items: Item[]) {
  container.innerHTML = ''; // Destroy all elements
  items.forEach(item => {
    const el = document.createElement('div'); // New element
    el.textContent = item.text;
    container.appendChild(el);
  });
}
```

At 60fps with 20 visible items, this creates/destroys **1,200 elements per second**.

### vlist's Element Pool

vlist maintains a pool of reusable DOM elements:

```typescript
// vlist/src/builder/pool.ts
export const createElementPool = (maxSize = 100) => {
  const pool: HTMLElement[] = [];

  return {
    acquire: (): HTMLElement => {
      // Try to reuse from pool
      const el = pool.pop();
      if (el) return el;
      
      // Only create if pool is empty
      const newEl = document.createElement("div");
      newEl.setAttribute("role", "option");
      return newEl;
    },
    
    release: (el: HTMLElement): void => {
      if (pool.length < maxSize) {
        // Clean and return to pool for reuse
        el.className = "";
        el.textContent = "";
        el.removeAttribute("style");
        el.removeAttribute("data-index");
        el.removeAttribute("data-id");
        pool.push(el);
      }
    },
    
    clear: (): void => {
      pool.length = 0;
    },
  };
};
```

**How it works:**

1. When an item scrolls into view, `acquire()` reuses an element from the pool
2. If pool is empty, create a new element (only happens initially)
3. When an item scrolls out, `release()` cleans it and returns it to the pool
4. Pool maintains up to 100 elements (configurable)

**Result**: After initial render, **zero new DOM elements created** during scrolling.

### Rendered Item Tracking

vlist tracks which elements are currently rendered with a simple Map:

```typescript
// vlist/src/builder/core.ts [L425]
const rendered = new Map<number, HTMLElement>();
```

This Map stores only the **visible items** (typically 20-50), not all items (potentially millions).

Compare this to React's fiber tree, which maintains nodes for the entire component hierarchy even for unmounted components.

## 4. Efficient Data Structures

### Size Cache: One Number for Fixed Sizes

For fixed-size items (the common case), vlist stores just **one number**:

```typescript
// vlist/src/rendering/sizes.ts
const createFixedSizeCache = (
  size: number,
  initialTotal: number,
): SizeCache => {
  let total = initialTotal;  // ← ONE number stores everything!

  return {
    // O(1) calculation - no storage needed
    getOffset: (index: number): number => index * size,
    
    getSize: (_index: number): number => size,
    
    indexAtOffset: (offset: number): number => {
      if (total === 0 || size === 0) return 0;
      return Math.max(0, Math.min(Math.floor(offset / size), total - 1));
    },

    getTotalSize: (): number => total * size,
    
    getTotal: (): number => total,
    
    rebuild: (newTotal: number): void => {
      total = newTotal;
    },

    isVariable: (): boolean => false,
  };
};
```

For 1 million items at 48px each:
- **vlist**: Stores `total = 1000000` (one number)
- **Typical framework**: Stores component instances, refs, state objects, event handlers

### Variable Size Cache: Prefix Sum Array

For variable-size items, vlist uses a prefix sum array (Float64Array):

```typescript
// vlist/src/rendering/sizes.ts
const createVariableSizeCache = (
  sizeFn: (index: number) => number,
  initialTotal: number,
): SizeCache => {
  let total = initialTotal;
  let prefixSums: Float64Array = new Float64Array(0);

  const build = (n: number): void => {
    total = n;
    prefixSums = new Float64Array(n + 1);
    prefixSums[0] = 0;
    for (let i = 0; i < n; i++) {
      prefixSums[i + 1] = prefixSums[i]! + sizeFn(i);
    }
  };

  // ... methods that use prefixSums for O(1) offset lookup
};
```

**Memory usage**: For N items, stores `Float64Array(N+1)` = 8 bytes per item + 8 bytes overhead.

For 10,000 items: `10,001 × 8 bytes = 80KB`

This is far less than framework-based solutions that store full component state per item.

### Selection State: Just a Set

Selection state uses native JavaScript Set:

```typescript
// vlist/src/features/selection/state.ts
export const createSelectionState = (
  initial?: Array<string | number>,
): SelectionState => ({
  selected: new Set(initial ?? []),  // ← Just a Set!
  focusedIndex: -1,                   // ← Just a number!
  focusVisible: false,                // ← Just a boolean!
});
```

**Total memory**: Set overhead + (8 bytes per selected ID) + 2 primitives

Compare to React's selection management:
- useState for selected items
- useState for focused index
- useRef for previous selection (range selection)
- useCallback memoized handlers
- Context provider/consumer overhead
- Component re-render tracking

## 5. Tree-Shakeable Features

vlist's builder pattern ensures you only load features you use:

```typescript
// Minimal bundle - just core
import { vlist } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
}).build();
```

```typescript
// With features - tree-shake what you don't use
import { vlist, withSelection, withScrollbar } from 'vlist';

const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar())
  .build();
```

Each feature is a separate module:

```
src/features/
├── async/         # Only loaded if you use withAsync()
├── grid/          # Only loaded if you use withGrid()
├── groups/        # Only loaded if you use withGroups()
├── masonry/       # Only loaded if you use withMasonry()
├── page/          # Only loaded if you use withPage()
├── scale/         # Only loaded if you use withScale()
├── scrollbar/     # Only loaded if you use withScrollbar()
├── selection/     # Only loaded if you use withSelection()
├── snapshots/     # Only loaded if you use withSnapshots()
└── table/         # Only loaded if you use withTable()
```

**Result**: Your bundle and runtime memory only include what you actually use.

## Memory Comparison: Framework vs vlist

### React Virtual List (Typical Implementation)

```typescript
function VirtualList({ items, itemHeight }) {
  // Memory allocations:
  const [scrollTop, setScrollTop] = useState(0);        // Hook state
  const [visibleRange, setVisibleRange] = useState(...); // Hook state
  const containerRef = useRef<HTMLDivElement>(null);    // Ref object
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map()); // Ref + Map
  
  // Memoized calculations (cache overhead)
  const visibleItems = useMemo(() => {
    // New array allocated on every range change
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);
  
  // Memoized callback (function wrapper overhead)
  const handleScroll = useCallback((e: Event) => {
    const newScrollTop = (e.target as HTMLElement).scrollTop;
    // New state object on every scroll
    setScrollTop(newScrollTop);
    setVisibleRange(calculateRange(newScrollTop, itemHeight));
  }, [itemHeight]);
  
  // Render - creates React elements (memory overhead)
  return (
    <div ref={containerRef} onScroll={handleScroll}>
      <div style={{ height: items.length * itemHeight }}>
        {visibleItems.map((item, i) => (
          <VirtualItem key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
```

**Memory overhead per list instance:**
- Component fiber node
- 2× useState hooks (with queues and update tracking)
- 2× useRef objects
- 1× useMemo cache
- 1× useCallback wrapper
- React elements for all visible items
- Fiber nodes for all visible items
- Props objects for all visible items
- Virtual DOM tracking

### vlist Equivalent

```typescript
import { vlist } from 'vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, state) => {
      const el = document.createElement('div');
      el.textContent = item.text;
      return el;
    },
  },
  items: data,
}).build();
```

**Memory overhead per list instance:**
- Shared state object (single object)
- Reusable range objects (2-3 small objects)
- DOM element pool (array of ~20-50 elements)
- Rendered items map (Map with ~20-50 entries)
- Size cache (1 number for fixed, or Float64Array for variable)

**Result**: ~10-20KB vs 500KB-5MB for framework-based solutions.

## Performance Impact

Lower memory usage has cascading benefits:

### 1. Reduced Garbage Collection

Less allocation means less GC pressure:

```
Framework approach (React):
- 120 new range objects per second (60fps × 2 ranges)
- 60 new array slices per second (visible items)
- 60 new props objects per visible item per second
→ Frequent GC pauses (5-20ms every few seconds)

vlist approach:
- 0 new objects during scrolling (all reused)
→ No GC pauses during scroll
```

### 2. Better Cache Locality

Fewer objects means better CPU cache utilization:
- Data structures fit in L1/L2 cache
- Less cache thrashing during scroll
- Faster iteration over visible items

### 3. Lower Baseline Memory

Applications can support:
- More lists on a single page
- Larger datasets per list
- Better performance on memory-constrained devices (mobile)

## Real-World Impact

### Mobile Devices

On a device with 2GB RAM:
- **vlist**: Can handle 50+ lists with 10K items each = 0.02 MB × 50 = **1 MB**
- **React virtual list**: 0.29 MB × 50 = **14.5 MB**
- **Virtua**: 24.51 MB × 50 = **1.2 GB** (60% of RAM!)

### Large Datasets

For a single list with 1M items:
- **vlist**: 0.02 MB (size cache scales linearly, but very slowly)
- **Framework lists**: Often struggle or crash due to memory pressure

### Multiple Instances

Dashboard with 10 virtual lists:
- **vlist**: 10 × 0.02 MB = **0.2 MB**
- **react-window**: 10 × 0.29 MB = **2.9 MB**
- **Virtua**: 10 × 24.51 MB = **245 MB**

## Measurement Methodology

Benchmarks measure heap memory after:
1. Creating virtual list instance
2. Rendering initial viewport (~20 items)
3. Scrolling through 100 items
4. Taking heap snapshot
5. Calculating retained size

Measured with Chrome DevTools Memory Profiler on:
- Chrome 120+
- MacBook Pro M1
- 10,000 items @ 48px height
- Container height: 600px (~12-13 visible items)

## Trade-offs

vlist's approach has some trade-offs:

### Learning Curve
- No familiar framework patterns (hooks, reactivity)
- Direct DOM manipulation may feel lower-level
- Must learn vlist's builder pattern

### Framework Integration
- Requires adapters (vlist-react, vlist-vue, vlist-solidjs)
- Adapters add some overhead (but still far less than native solutions)

### Ecosystem
- Smaller ecosystem compared to React/Vue libraries
- Fewer third-party extensions
- Less community examples

**However**: The performance and memory benefits far outweigh these costs for most use cases.

## Conclusion

vlist achieves 98-99% lower memory usage through disciplined engineering:

1. **No framework overhead** - Pure vanilla JavaScript
2. **Object reuse** - Mutate instead of allocate
3. **Element pooling** - Recycle DOM nodes
4. **Efficient data structures** - Minimal state with optimal representations
5. **Tree-shakeable** - Pay only for what you use

This results in:
- ✅ **0.02 MB** memory usage (vs 0.29-24.51 MB for competitors)
- ✅ **Zero GC pauses** during scroll
- ✅ **Better cache locality** and CPU efficiency
- ✅ **Scales to millions of items** on memory-constrained devices

The architecture proves that excellent virtualization doesn't require framework overhead - it just requires careful engineering.

## Related

- [Rendering](./rendering.md) - Rendering pipeline details
- [Structure](./structure.md) - Source code organization
- [Stats](./stats.md) - Performance monitoring utilities