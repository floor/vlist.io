# Memory Baseline Measurements (Before Optimizations)

**Date:** February 2025
**Status:** 📊 Baseline established before memory optimizations
**vlist Version:** 0.7.7 (staging branch with Option A merged)
**Related:** [memory-performance-roadmap.md](./memory-performance-roadmap.md)

---

## Purpose

This document establishes baseline memory measurements **before** implementing the critical memory optimizations identified in the roadmap. We'll re-run these same benchmarks after each optimization to measure impact.

---

## Test Environment

- **Browser:** Chrome with `--enable-precise-memory-info` flag
- **Machine:** [To be filled after running benchmarks]
- **vlist Build:** staging branch (71.9 KB minified, 23.7 KB gzipped)
- **Benchmark Suite:** `vlist.dev/benchmarks/memory/javascript/suite.js`

---

## Baseline Measurements

### Test 1: 10,000 Items

**Configuration:**
```javascript
vlist({
  container,
  item: {
    height: 48,  // Fixed height
    template: benchmarkTemplate,
  },
  items: generateItems(10_000),
}).build();
```

**Expected Results (to be filled):**
- After render: ___ MB
- Scroll delta (10s): ___ MB
- Total heap: ___ MB
- Rating: ___

### Test 2: 100,000 Items

**Configuration:**
```javascript
vlist({
  container,
  item: {
    height: 48,
    template: benchmarkTemplate,
  },
  items: generateItems(100_000),
}).build();
```

**Expected Results (to be filled):**
- After render: ___ MB
- Scroll delta (10s): ___ MB
- Total heap: ___ MB
- Rating: ___

### Test 3: 1,000,000 Items

**Configuration:**
```javascript
vlist({
  container,
  item: {
    height: 48,
    template: benchmarkTemplate,
  },
  items: generateItems(1_000_000),
}).build();
```

**Expected Results (to be filled):**
- After render: ___ MB
- Scroll delta (10s): ___ MB
- Total heap: ___ MB
- Rating: ___

---

## Analysis (Current Implementation)

### Known Memory Issues

Based on code analysis in [memory-performance-roadmap.md](./memory-performance-roadmap.md):

1. **Items Array Copy** 🚨
   - Current: `const initialItemsCopy: T[] = initialItems ? [...initialItems] : []`
   - Impact: Full copy of all items stored in closure
   - Estimated overhead per 100K items: ~20 MB

2. **idToIndex Map** ⚠️
   - Current: Always built for all items
   - Impact: Map<id, index> for O(1) lookups
   - Estimated overhead per 100K items: ~3.2 MB

3. **Other Components** ✅
   - heightCache: Needed for positioning (~800 KB per 100K items)
   - rendered Map: Only visible items (~2 KB)
   - pool: 100 elements (~10 KB)
   - refs object (Option A): ~0.3 KB
   - Total: ~0.8 MB

### Expected Baseline

For 100,000 items, we expect:
- Items array copy: ~20 MB
- idToIndex Map: ~3.2 MB
- Other components: ~0.8 MB
- **Total: ~24 MB**

For 1,000,000 items, we expect:
- Items array copy: ~200 MB
- idToIndex Map: ~32 MB
- Other components: ~8 MB
- **Total: ~240 MB**

---

## Planned Optimizations

### Optimization 1: Remove Items Array Copy

**Implementation:**
```typescript
// Add config flag
interface BuilderConfig<T> {
  items?: {
    data: T[];
    copyOnInit?: boolean;  // Default: true (safe), false (memory-efficient)
  };
}

// Use reference when copyOnInit: false
const itemsArray = config.items?.copyOnInit === false 
  ? config.items.data 
  : (config.items?.data ? [...config.items.data] : []);
```

**Expected Impact:**
- 100K items: Save ~20 MB (83% reduction)
- 1M items: Save ~200 MB (83% reduction)

### Optimization 2: Optional idToIndex Map

**Implementation:**
```typescript
// Add config flag
interface BuilderConfig<T> {
  enableItemById?: boolean;  // Default: true (backward compatible)
}

// Conditional map creation
const idToIndex = config.enableItemById !== false 
  ? new Map<string | number, number>() 
  : null;
```

**Expected Impact:**
- 100K items: Save ~3.2 MB (13% reduction)
- 1M items: Save ~32 MB (13% reduction)

### Combined Impact

**For 100K items:**
- Current: ~24 MB
- After both optimizations: ~0.8 MB
- **Savings: ~23.2 MB (97% reduction)**

**For 1M items:**
- Current: ~240 MB
- After both optimizations: ~8 MB
- **Savings: ~232 MB (97% reduction)**

---

## How to Run Benchmarks

### Option 1: Web UI (Recommended)

```bash
cd vlist.dev
bun run dev
# Open http://localhost:3000/benchmarks
# Select "Memory (JavaScript)" suite
# Run tests for 10K, 100K, and 1M items
```

### Option 2: Automated (TODO)

```bash
cd vlist.dev/benchmarks
# TODO: Create automated benchmark runner
bun run benchmark:memory --items=100000 --output=baseline.json
```

---

## Measurement Notes

### Important Considerations

1. **GC Timing:** Results can vary ±10% based on garbage collection timing
2. **Run Multiple Times:** Take average of 3-5 runs for each test
3. **Chrome Only:** `performance.memory` API requires Chrome with `--enable-precise-memory-info`
4. **Settle Time:** Benchmarks wait 20 frames + GC between measurements for stability

### Data Generation

The benchmark uses `generateItems()` which creates items like:
```javascript
{
  id: i,
  name: `Item ${i}`,
  value: Math.random(),
  // ~200 bytes per item (rough estimate)
}
```

---

## Next Steps

1. ✅ Build benchmarks: `bun run build:bench`
2. ⏳ **Run baseline measurements** (fill in results above)
3. ⏳ Implement Optimization 1 (remove items copy)
4. ⏳ Run benchmarks again and compare
5. ⏳ Implement Optimization 2 (optional idToIndex)
6. ⏳ Run benchmarks again and compare
7. ⏳ Document final results in [memory-optimization-results.md](./memory-optimization-results.md)

---

## Appendix: Benchmark Suite Details

### Memory Benchmark Flow

1. **Baseline:** Measure heap before vlist creation
2. **After Render:** Create vlist, wait for GC, measure heap
3. **After Scroll:** Scroll for 10s (bouncing), wait for GC, measure heap
4. **Metrics:**
   - **Render delta:** `afterRender - baseline` (initial memory cost)
   - **Scroll delta:** `afterScroll - afterRender` (memory leaks during scroll)
   - **Total heap:** Absolute heap size after render
   - **Total delta:** `afterScroll - baseline` (total memory impact)

### Rating Thresholds (100K items)

| Metric | Good | OK | Bad |
|--------|------|----|----|
| After render | < 15 MB | < 40 MB | > 40 MB |
| Scroll delta | < 1 MB | < 5 MB | > 5 MB |

For 1M items, thresholds are 5-10× higher due to larger data arrays.

---

## Related Documents

- [memory-performance-roadmap.md](./memory-performance-roadmap.md) — Complete optimization plan
- [decompose-builder-core.md](./decompose-builder-core.md) — Context on Option A choice