# Memory & Performance Optimization Roadmap

**Date:** February 2026
**Status:** 🎯 Active — High priority optimizations identified
**Related:** [decompose-builder-core.md](./decompose-builder-core.md)

---

## Project Priorities

1. **Speed/Smoothness** — Be the fastest virtual list library (maintain 60 FPS)
2. **Memory Efficiency** — Minimize memory per instance (critical for multi-list pages)
3. **Bundle Size** — Keep small but secondary to performance/memory
4. **Code Maintainability** — Balance readability with performance

---

## Current Memory Footprint Analysis

### Per vlist Instance (Estimated)

```typescript
// For a list with 100,000 items:
1. items array (COPY!)        ~20 MB  🚨 CRITICAL
2. idToIndex Map               ~3.2 MB  ⚠️ HIGH
3. heightCache (variable)      ~800 KB  ✅ Needed
4. rendered Map                ~2 KB    ✅ Minimal (only visible items)
5. pool (100 elements)         ~10 KB   ✅ Configurable
6. velocityTracker             ~0.5 KB  ✅ Minimal
7. selectionSet                varies   📊 Depends on selection count
8. refs object (Option A)      ~0.3 KB  ✅ Minimal
9. Event listeners/callbacks   ~1 KB    ✅ Minimal
10. Feature state               varies   📊 Needs audit

TOTAL (100K items):            ~24 MB per instance
```

### Multi-Instance Impact

**Use case:** Dashboard with 5 list instances (100K items each)

| Component | Per Instance | × 5 Instances | Optimization Potential |
|-----------|--------------|---------------|------------------------|
| Items array copies | 20 MB | **100 MB** 🚨 | ~100 MB (use references) |
| idToIndex Maps | 3.2 MB | 16 MB ⚠️ | ~16 MB (make optional) |
| Other | 0.8 MB | 4 MB | Minimal |
| **TOTAL** | **24 MB** | **120 MB** | **~116 MB (97% reduction)** |

---

## 🚨 Critical Optimization: Fix Items Array Copy

### Current Implementation (Bad)

```typescript
// src/builder/core.ts ~L236
const initialItemsCopy: T[] = initialItems ? [...initialItems] : [];

const $: MRefs<T> = {
  it: initialItemsCopy,  // Full copy stored in closure!
  // ...
};
```

**Problem:** 
- Creates a full duplicate of all items in memory
- 100,000 items × ~200 bytes each = **~20 MB wasted per instance**
- Multi-list pages: 5 instances = **~100 MB wasted**
- This is likely the main user complaint about "instances being too large"

### Proposed Fix

**Option 1: Store Reference Only** (Requires careful mutation handling)

```typescript
// Store reference, not copy
const $: MRefs<T> = {
  it: initialItems || [],  // Reference only
  // ...
};

// In data proxy setItems():
setItems: (newItems: T[], offset = 0, newTotal?: number) => {
  if (offset === 0) {
    // Replace entire array - user's responsibility to not mutate
    $.it = newItems;
  } else {
    // Partial update - copy on write
    const copy = [...$.it];
    for (let i = 0; i < newItems.length; i++) {
      copy[offset + i] = newItems[i]!;
    }
    $.it = copy;
  }
  // ...
}
```

**Trade-offs:**
- ✅ Saves ~20 MB per 100K items
- ⚠️ User must not mutate passed array (document clearly)
- ⚠️ Partial updates require copy-on-write

**Option 2: Config Flag** (Conservative approach)

```typescript
interface BuilderConfig<T> {
  // ...
  items?: {
    data: T[];
    copyOnInit?: boolean;  // Default: true (safe), false (memory-efficient)
  };
}
```

**Trade-offs:**
- ✅ Backward compatible (default = safe)
- ✅ Opt-in memory optimization for power users
- ⚠️ Config API becomes more complex

**Recommendation:** Start with Option 2 (config flag) for safety, then consider making Option 1 the default in v1.0 with breaking change warning.

### Implementation Steps

1. Add `copyOnInit` config option (default: `true`)
2. Update initialization logic to respect flag
3. Document mutation requirements when `copyOnInit: false`
4. Add test cases for both modes
5. Measure memory savings in benchmarks
6. Consider making `false` the default in next major version

**Estimated Impact:** ~20 MB saved per 100K items per instance

---

## ⚠️ High Priority: Optional `idToIndex` Map

### Current Implementation

```typescript
// src/builder/core.ts ~L331
const idToIndex = new Map<string | number, number>();

const rebuildIdIndex = (): void => {
  idToIndex.clear();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item) idToIndex.set(item.id, i);
  }
};

rebuildIdIndex();  // Always built, O(n) memory
```

**Problem:**
- Always built, even if `getItemById()` never called
- 100,000 items = **~3.2 MB** (32 bytes per entry)
- Many use cases don't need ID lookups (sequential access only)

### Proposed Fix

**Config Flag:**

```typescript
interface BuilderConfig<T> {
  // ...
  enableItemById?: boolean;  // Default: true (backward compatible)
}
```

**Implementation:**

```typescript
const idToIndex = config.enableItemById !== false 
  ? new Map<string | number, number>() 
  : null;

const rebuildIdIndex = (): void => {
  if (!idToIndex) return;
  idToIndex.clear();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item) idToIndex.set(item.id, i);
  }
};

// In data proxy:
getItemById: (id: string | number) => {
  if (!idToIndex) {
    console.warn('getItemById() called but enableItemById is false');
    return undefined;
  }
  const idx = idToIndex.get(id);
  return idx !== undefined ? $.it[idx] : undefined;
}
```

**Trade-offs:**
- ✅ Saves ~3.2 MB per 100K items when disabled
- ✅ Backward compatible (default: enabled)
- ⚠️ Warning if used when disabled (runtime check)

**Estimated Impact:** ~3 MB saved per 100K items (if disabled)

---

## 📊 Medium Priority: Feature Memory Audits

### Features to Audit

#### 1. `withData` Feature
- May cache ranges unnecessarily
- Check if placeholders consume extra memory
- Consider lazy loading strategies

#### 2. `withSelection` Feature
```typescript
// Current: Set grows with selected items
const selectionSet: Set<string | number> = new Set();

// For 10,000 selected items: ~200 KB
```

**Optimization:** Offer range-based selection API for large selections
```typescript
// Instead of: Set with 10,000 IDs (200 KB)
// Use: Array of ranges (much smaller)
const selectedRanges = [
  { start: 0, end: 999 },
  { start: 5000, end: 5999 },
];
```

#### 3. `withCompression` Feature
- Additional state for virtual scrolling
- Measure heap impact with heap snapshots
- Document memory trade-offs

### Action Items

1. Create `docs/features/memory-impact.md`
2. Document memory footprint for each feature
3. Add memory benchmarks to test suite
4. Offer memory-efficient alternatives where possible

---

## 🎯 Performance Benchmarking

### Goal: Validate "Fastest Virtual List Library" Claim

### Competitors to Benchmark Against

1. **react-window** (most popular, 15.5K stars)
   - Bundle: ~7 KB
   - Proven performance
   - Limited features

2. **@tanstack/react-virtual** (modern, 4.8K stars)
   - Bundle: ~12 KB
   - Good performance
   - More features than react-window

3. **virtua** (newer, performance-focused, 1.2K stars)
   - Bundle: ~10 KB
   - Claims best performance
   - Framework-agnostic

### Metrics to Measure

#### 1. FPS During Scroll
- **Test:** Scroll through 100K items at constant velocity for 10 seconds
- **Measure:** Average, minimum, and p99 FPS
- **Target:** Consistent 60 FPS (16.67ms frame budget)
- **Tools:** Chrome DevTools Performance profiler

#### 2. Time to First Render
- **Test:** Initialize lists of 10K, 100K, 1M items
- **Measure:** Time from `vlist()` call to first visible items rendered
- **Target:** < 100ms for 100K items
- **Tools:** `performance.now()` markers

#### 3. Memory per Instance
- **Test:** Create 1, 10, 100 list instances
- **Measure:** Heap size before/after (Chrome DevTools Memory profiler)
- **Target:** < 5 MB per 100K items (after optimizations)
- **Tools:** Heap snapshots

#### 4. Bundle Size
- **Measure:** Minified + gzipped size
- **Current:** vlist = 23.7 KB gzipped
- **Comparison:** react-window = ~3 KB, @tanstack/react-virtual = ~5 KB
- **Note:** vlist includes more features (features, compression, etc.)

### Benchmark Suite Structure

```
vlist/benchmark/
├── index.html              # Test harness
├── scroll-fps.ts           # FPS measurement
├── memory-usage.ts         # Heap snapshots
├── time-to-render.ts       # Initialization speed
├── compare-libraries.ts    # Side-by-side comparison
└── README.md               # How to run benchmarks
```

### Implementation Plan

1. **Week 1:** Set up benchmark infrastructure
   - Create test harness with all libraries
   - Implement measurement utilities
   - Add data generators (10K, 100K, 1M items)

2. **Week 2:** Run baseline benchmarks
   - Measure current vlist performance
   - Compare against competitors
   - Identify performance bottlenecks

3. **Week 3:** Optimize and re-measure
   - Apply memory optimizations (items copy, idToIndex)
   - Re-run benchmarks
   - Document improvements

4. **Week 4:** Publish results
   - Create `docs/performance/benchmarks.md`
   - Update README with performance claims
   - Consider blog post / demo site

---

## 🔍 Low Priority: Other Optimizations

### 1. Configurable Pool Size

**Current:** Default `maxSize = 100` elements

```typescript
// Already configurable but not documented
const pool = createElementPool(config.pool?.maxSize ?? 100);
```

**Action:** Document in API reference

**Impact:** Minimal (elements are lightweight when recycled)

### 2. Lazy Height Cache for Fixed Heights

**Current:** Already optimized (no prefix sums for fixed heights)

```typescript
// src/rendering/heights.ts
if (typeof heightOrFn === 'number') {
  // Fixed height: O(1) calculations, no array
  return {
    getHeight: () => heightOrFn,
    getOffset: (i) => i * heightOrFn,
    indexAtOffset: (o) => Math.floor(o / heightOrFn),
    // ...
  };
}
```

**Action:** None needed (already optimal)

### 3. Event Listener Cleanup

**Check:** Are all listeners properly removed on `destroy()`?

```typescript
// src/builder/core.ts
const destroy = (): void => {
  // Verify all listeners cleaned up
  scrollTarget.removeEventListener('scroll', onScrollFrame);
  dom.items.removeEventListener('click', handleClick);
  // ... etc
};
```

**Action:** Audit in destroy() function, add tests

---

## Implementation Roadmap

### Phase 1: Critical Memory Wins (1-2 weeks)
- [ ] Implement `copyOnInit` config flag for items array
- [ ] Add tests for reference vs copy modes
- [ ] Document mutation requirements
- [ ] Implement `enableItemById` config flag
- [ ] Add runtime warnings for disabled features
- [ ] Measure memory savings (heap snapshots)

**Expected Impact:** ~23 MB saved per 100K items per instance (with both optimizations)

### Phase 2: Performance Benchmarking (2-3 weeks)
- [ ] Set up benchmark infrastructure
- [ ] Implement FPS measurement during scroll
- [ ] Implement memory profiling
- [ ] Compare against react-window, @tanstack/react-virtual, virtua
- [ ] Document results in `docs/performance/benchmarks.md`

**Goal:** Validate or adjust "fastest library" claim with data

### Phase 3: Feature Memory Audits (1-2 weeks)
- [ ] Audit withData feature memory usage
- [ ] Audit withSelection feature (consider range-based API)
- [ ] Audit withCompression feature
- [ ] Document memory impact in feature docs
- [ ] Add memory benchmarks for each feature

**Goal:** Complete memory story for all features

### Phase 4: Performance Tuning (ongoing)
- [ ] Profile hot-path code in production workloads
- [ ] Identify any remaining bottlenecks
- [ ] Consider micro-optimizations if needed
- [ ] Monitor bundle size on each change

---

## Success Metrics

### Memory Efficiency
- **Before:** ~24 MB per 100K items per instance
- **Target:** < 5 MB per 100K items per instance (with optimizations enabled)
- **Improvement:** ~80% reduction

### Performance
- **Target:** Maintain 60 FPS for lists up to 1M items
- **Target:** Faster or equal to competitors on all benchmarks
- **Target:** < 100ms time to first render for 100K items

### Developer Experience
- **Config flags clearly documented**
- **Memory/performance trade-offs explained**
- **Benchmarks published and reproducible**
- **Migration guide for breaking changes (if any)**

---

## Related Documents

- [decompose-builder-core.md](./decompose-builder-core.md) — Current refactoring effort
- [decompose-core-option-a.md](./decompose-core-option-a.md) — Chosen implementation
- [decompose-core-option-b.md](./decompose-core-option-b.md) — Rejected alternative

---

## Notes

- The items array copy is the #1 memory issue — fix this first
- Bundle size increases from decomposition are acceptable given memory/performance priorities
- All optimizations should be backward compatible via config flags
- Benchmark against competitors before making performance claims public
