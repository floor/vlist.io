# Async Module

> Asynchronous data loading with lazy loading and placeholders.

## Overview

The async module handles all data-related operations in vlist, designed for efficient handling of large datasets (1M+ items):

- **Adapter Pattern**: Fetch data from any API with a single `read` function
- **Sparse Storage**: Memory-efficient chunked storage with LRU eviction
- **Placeholder System**: Smart loading state indicators while data loads
- **Velocity-Based Loading**: Skip loads during fast scrolling, preload in scroll direction

## Module Structure

```
src/features/async/
├── index.ts       # Module exports
├── feature.ts      # withAsync() feature
├── manager.ts     # Data manager (main coordinator)
├── sparse.ts      # Sparse storage implementation
└── placeholder.ts # Placeholder generation
```

## withAsync Configuration

The `withAsync` feature is the main API for adding async data loading to vlist:

```typescript
import { vlist, withAsync } from '@floor/vlist'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem }
})
.use(withAsync({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.items, total: data.total }
    }
  },
  autoLoad: true,  // Load data immediately (default: true)
  storage: {
    chunkSize: 100,      // Items per chunk (default: 100)
    maxCachedItems: 10000 // Max items in memory (default: 10000)
  },
  loading: {
    cancelThreshold: 5,   // Cancel load above this velocity (default: 5)
    preloadThreshold: 2,  // Preload above this velocity (default: 2)
    preloadAhead: 50      // Items to preload (default: 50)
  }
}))
.build()
```

### Configuration Options

#### adapter (required)
Async data source with a `read` function:
- **Input**: `{ offset: number, limit: number, signal?: AbortSignal }`
- **Output**: `Promise<{ items: T[], total: number, hasMore?: boolean, cursor?: string }>`

#### autoLoad (optional)
Whether to automatically load initial data. Default: `true`
- Set to `false` if you need to initialize state before loading
- Call `list.reload()` when ready to load data

#### total (optional)
Initial total count when `autoLoad: false`. Prevents vlist from thinking the list is empty.

#### storage (optional)
Configure sparse storage behavior:
- `chunkSize`: Number of items per chunk (default: 100)
  - **Important**: Should match your API pagination size for optimal performance
  - Example: If your API returns 25 items per page, use `chunkSize: 25`
- `maxCachedItems`: Maximum items in memory before eviction (default: 10000)

#### loading (optional)
Velocity-based loading optimization:
- `cancelThreshold`: Velocity (px/ms) above which loading is skipped (default: 5)
- `preloadThreshold`: Velocity (px/ms) for preloading ahead (default: 2)
- `preloadAhead`: Number of items to preload in scroll direction (default: 50)

## Complete Integration

```typescript
import { vlist, withAsync } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item, index) => {
      const isLoading = !item || String(item.id).startsWith('__placeholder_');
      return `
        <div class="item ${isLoading ? 'loading' : ''}">
          ${isLoading ? 'Loading...' : item.name}
        </div>
      `;
    },
  },
})
.use(withAsync({
  adapter: {
    read: async ({ offset, limit, cursor }) => {
      const url = cursor 
        ? `/api/items?cursor=${cursor}&limit=${limit}`
        : `/api/items?offset=${offset}&limit=${limit}`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        items: data.items,
        total: data.total,
        cursor: data.nextCursor,
        hasMore: data.hasMore
      };
    },
  },
}))
.build();

// Events
list.on('load:start', ({ offset, limit }) => {
  showLoadingIndicator();
});

list.on('load:end', ({ items, total }) => {
  hideLoadingIndicator();
  updateTotalCount(total);
});

list.on('error', ({ error, context }) => {
  if (context === 'loadMore') {
    showRetryButton();
  }
});
```

## Usage Examples

### Deferred Loading

```typescript
const list = vlist({ /* ... */ })
.use(withAsync({
  adapter: myAdapter,
  autoLoad: false,  // Don't load immediately
  total: 0          // Start with empty list
}))
.build()

// Later, after setting filters/state:
list.reload()  // Now load data
```

### Custom Chunk Size

```typescript
const list = vlist({ /* ... */ })
.use(withAsync({
  adapter: myAdapter,
  storage: {
    chunkSize: 25  // Match API page size
  }
}))
.build()
```

### Placeholder Detection in Templates

```typescript
import { isPlaceholderItem } from '@floor/vlist';

item: {
  height: 48,
  template: (item, index, state) => {
    if (isPlaceholderItem(item)) {
      return `<div class="item loading">${item.name}</div>`;
    }
    return `<div class="item">${item.name}</div>`;
  },
}
```

## Key Concepts

### Sparse Storage

Instead of loading all items into memory, vlist uses **sparse storage**:

```
Total: 1,000,000 items
Loaded: Only items 0-99, 5000-5099 (200 items in memory)
Memory saved: 99.98%
```

Items are stored in **chunks** (default: 100 items per chunk):

```
Chunk 0:  items 0-99
Chunk 1:  items 100-199
Chunk 50: items 5000-5099
...
```

### Placeholder Generation

When items aren't loaded, placeholders are shown:

```typescript
// Real item
{ id: 'user-1', name: 'John Doe', email: 'john@example.com' }

// Placeholder (analyzed structure)
{ id: '__placeholder_0', _isPlaceholder: true, name: '████████', email: '███████████████' }
```

### Data Flow

```
User scrolls to new range
    ↓
DataManager.ensureRange(start, end)
    ↓
Check SparseStorage for missing items
    ↓
Missing? → Call Adapter.read()
    ↓
Store items in SparseStorage
    ↓
Emit 'load:end' event
    ↓
Renderer re-renders with real data
```

### Chunk-Based Loading

Items are loaded in chunk-aligned boundaries for efficiency:

```typescript
// Request: load items 50-150
// Chunk size: 100

// Aligned to chunks:
// Chunk 0: items 0-99 (includes 50-99)
// Chunk 1: items 100-199 (includes 100-150)

// Actually loaded: items 0-199
```

This reduces redundant loads when scrolling back and forth.

### Deduplication

The data manager prevents duplicate loading:

```typescript
// Scroll handler calls ensureRange rapidly
await dataManager.ensureRange(100, 200);  // Starts loading
await dataManager.ensureRange(100, 200);  // Returns existing promise
await dataManager.ensureRange(100, 200);  // Returns existing promise

// Only ONE API call is made
```

## Memory Management

### Eviction Strategy

When memory limits are reached, chunks far from the visible area are evicted:

```
Visible: items 5000-5050
Buffer: 200 items
Keep zone: 4800-5250

Evict chunks outside keep zone using LRU
```

### Configuration Guidelines

| List Size | Chunk Size | Max Cached | Buffer |
|-----------|------------|------------|--------|
| < 10K | 100 | 5,000 | 200 |
| 10K - 100K | 100 | 10,000 | 500 |
| 100K - 1M | 100 | 10,000 | 500 |
| > 1M | 100 | 10,000 | 500 |

### Stats Monitoring

```typescript
const stats = dataManager.getStorage().getStats();

console.log({
  totalItems: stats.totalItems,          // 1,000,000
  cachedItems: stats.cachedItems,        // 5,000
  cachedChunks: stats.cachedChunks,      // 50
  memoryEfficiency: stats.memoryEfficiency  // 0.995 (99.5%)
});
```

## Performance Optimizations

### Batched LRU Timestamps

Sparse storage uses LRU (Least Recently Used) eviction to manage memory. Each chunk tracks when it was last accessed. Rather than calling `Date.now()` on every `storage.get()` call during rendering, vlist batches timestamp updates via `touchChunksForRange(start, end)`:

- **Before**: ~20-50 `Date.now()` calls per frame (one per visible item)
- **After**: 1 `Date.now()` call per frame (batched for the entire render range)

This is called automatically by the renderer before accessing items for a range.

### Direct Getters vs getState()

The data manager exposes both `getState()` (returns a full `DataState` object) and individual getters (`getTotal()`, `getCached()`, `getIsLoading()`, `getHasMore()`). The direct getters are used on hot paths to avoid object allocation:

```typescript
// ✅ Hot path — zero allocation
const total = dataManager.getTotal();
const cached = dataManager.getCached();
const isLoading = dataManager.getIsLoading();

// ❌ Avoid on hot paths — allocates DataState object
const { total, cached, isLoading } = dataManager.getState();
```

`getState()` is still useful for diagnostics, logging, or infrequent reads where the allocation cost is negligible.

## Internals

The following low-level APIs power the async system. Most users never call these directly — they are used internally by `withAsync` and exposed for advanced use cases like custom feature authoring.

### Data Manager

#### createDataManager

Creates a data manager instance.

```typescript
function createDataManager<T extends VListItem>(
  config: DataManagerConfig<T>
): DataManager<T>;

interface DataManagerConfig<T extends VListItem> {
  /** Async data adapter */
  adapter?: VListAdapter<T>;
  
  /** Initial items (optional) */
  initialItems?: T[];
  
  /** Initial total count (if known) */
  initialTotal?: number;
  
  /** Sparse storage configuration */
  storage?: SparseStorageConfig;
  
  /** Placeholder configuration */
  placeholder?: PlaceholderConfig;
  
  /** Items per load request (default: 50) */
  pageSize?: number;
  
  /** Callback when state changes */
  onStateChange?: (state: DataState<T>) => void;
  
  /** Callback when items are loaded */
  onItemsLoaded?: (items: T[], offset: number, total: number) => void;
  
  /** Callback when items are evicted */
  onItemsEvicted?: (count: number) => void;
}
```

#### DataManager Interface

```typescript
interface DataManager<T extends VListItem> {
  // State
  getState: () => DataState<T>;
  
  // Direct getters (hot-path optimized, zero object allocation)
  getTotal: () => number;
  getCached: () => number;
  getIsLoading: () => boolean;
  getHasMore: () => boolean;
  
  // Storage access
  getStorage: () => SparseStorage<T>;
  getPlaceholders: () => PlaceholderManager<T>;
  
  // Item access
  getItem: (index: number) => T | undefined;
  getItemById: (id: string | number) => T | undefined;
  getIndexById: (id: string | number) => number;
  isItemLoaded: (index: number) => boolean;
  getItemsInRange: (start: number, end: number) => T[];
  
  // Data operations
  setTotal: (total: number) => void;
  setItems: (items: T[], offset?: number, total?: number) => void;
  updateItem: (id: string | number, updates: Partial<T>) => boolean;
  removeItem: (id: string | number) => boolean;
  
  // Loading
  loadRange: (start: number, end: number) => Promise<void>;
  ensureRange: (start: number, end: number) => Promise<void>;
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<boolean>;
  reload: () => Promise<void>;
  
  // Memory management
  evictDistant: (visibleStart: number, visibleEnd: number) => void;
  
  // Lifecycle
  clear: () => void;
  reset: () => void;
}
```

#### DataState Interface

```typescript
interface DataState<T extends VListItem> {
  /** Total items (declared, may be larger than loaded) */
  total: number;
  
  /** Number of items in memory */
  cached: number;
  
  /** Whether data is loading */
  isLoading: boolean;
  
  /** Pending load ranges */
  pendingRanges: Range[];
  
  /** Error from last operation */
  error: Error | undefined;
  
  /** Whether more items exist */
  hasMore: boolean;
  
  /** Current cursor (for cursor pagination) */
  cursor: string | undefined;
}
```

### Sparse Storage

#### createSparseStorage

Creates sparse storage for efficient large list handling.

```typescript
function createSparseStorage<T extends VListItem>(
  config?: SparseStorageConfig
): SparseStorage<T>;

interface SparseStorageConfig {
  /** Number of items per chunk (default: 100) */
  chunkSize?: number;
  
  /** Maximum items to keep in memory (default: 5000) */
  maxCachedItems?: number;
  
  /** Extra items to keep around visible range (default: 200) */
  evictionBuffer?: number;
  
  /** Callback when items are evicted */
  onEvict?: (evictedCount: number, evictedRanges: number[]) => void;
}
```

#### SparseStorage Interface

```typescript
interface SparseStorage<T extends VListItem> {
  // Configuration
  readonly chunkSize: number;
  readonly maxCachedItems: number;
  
  // Total management
  getTotal: () => number;
  setTotal: (total: number) => void;
  
  // Item access
  get: (index: number) => T | undefined;
  has: (index: number) => boolean;
  set: (index: number, item: T) => void;
  setRange: (offset: number, items: T[]) => void;
  delete: (index: number) => boolean;
  
  // Range operations
  getRange: (start: number, end: number) => (T | undefined)[];
  isRangeLoaded: (start: number, end: number) => boolean;
  getLoadedRanges: () => Range[];
  findUnloadedRanges: (start: number, end: number) => Range[];
  
  // Chunk operations
  getChunkIndex: (itemIndex: number) => number;
  isChunkLoaded: (chunkIndex: number) => boolean;
  touchChunk: (chunkIndex: number) => void;
  
  // LRU timestamp management
  touchChunksForRange: (start: number, end: number) => void;
  
  // Eviction
  evictDistant: (visibleStart: number, visibleEnd: number) => number;
  evictToLimit: () => number;
  
  // Statistics
  getStats: () => SparseStorageStats;
  getCachedCount: () => number;
  
  // Lifecycle
  clear: () => void;
  reset: () => void;
}

interface SparseStorageStats {
  totalItems: number;
  cachedItems: number;
  cachedChunks: number;
  chunkSize: number;
  maxCachedItems: number;
  memoryEfficiency: number;  // 1 - (cachedItems / totalItems)
}
```

### Placeholder Manager

#### createPlaceholderManager

Creates a placeholder manager for loading states.

```typescript
function createPlaceholderManager<T extends VListItem>(
  config?: PlaceholderConfig
): PlaceholderManager<T>;

interface PlaceholderConfig {
  /** Enable placeholder generation (default: true) */
  enabled?: boolean;
  
  /** Character used for masking text (default: '█') */
  maskCharacter?: string;
  
  /** Add random variance to text lengths (default: true) */
  randomVariance?: boolean;
  
  /** Maximum items to sample for structure analysis (default: 20) */
  maxSampleSize?: number;
  
  /** Custom placeholder generator */
  customGenerator?: (index: number) => VListItem;
}
```

#### PlaceholderManager Interface

```typescript
interface PlaceholderManager<T extends VListItem> {
  /** Analyze data structure from sample items */
  analyzeStructure: (items: T[]) => void;
  
  /** Check if structure has been analyzed */
  hasAnalyzedStructure: () => boolean;
  
  /** Generate a single placeholder item */
  generate: (index: number) => T;
  
  /** Generate multiple placeholder items */
  generateRange: (start: number, end: number) => T[];
  
  /** Check if an item is a placeholder */
  isPlaceholder: (item: unknown) => boolean;
  
  /** Get the placeholder flag key */
  getPlaceholderKey: () => string;
  
  /** Clear analyzed structure */
  clear: () => void;
}
```

### Utility Functions

```typescript
// Check if item is a placeholder
function isPlaceholderItem(item: unknown): boolean;

// Filter out placeholders from array
function filterPlaceholders<T extends VListItem>(items: T[]): T[];

// Count non-placeholder items
function countRealItems<T extends VListItem>(items: (T | undefined)[]): number;

// Replace placeholders with real items
function replacePlaceholders<T extends VListItem>(
  target: (T | undefined)[],
  items: T[],
  offset: number
): number;

// Merge adjacent/overlapping ranges
function mergeRanges(ranges: Range[]): Range[];

// Calculate ranges that need to be loaded
function calculateMissingRanges(
  needed: Range,
  loaded: Range[],
  chunkSize: number
): Range[];
```

## Related Modules

- [Types](../api/types.md) — VListAdapter, VListItem interfaces
- [Placeholders](./placeholders.md) — Placeholder configuration and styling
- [Rendering](../internals/rendering.md) — Renderer displays items/placeholders
- [Context](../internals/context.md) — BuilderContext wires scroll handler that triggers data loading

## Live Examples

- [Velocity Loading](/examples/data/velocity-loading) — Smart loading that skips during fast scrolling

---

*The async module enables vlist to efficiently handle datasets of any size via `withAsync()`.*