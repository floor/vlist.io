# Memory Optimization Test Instructions

**Date:** February 2025
**Status:** 🧪 Testing in progress
**Task:** Measure memory impact of optimization flags

---

## Quick Start

Chrome should already be open with the test page. If not:

```bash
cd vlist.dev
./run-memory-test.sh
```

---

## Test Procedure

### 1. Run 10K Items Test

1. Click the **"Test 10K Items"** button
2. Wait for the test to complete (~10-15 seconds)
3. Record the results below

### 2. Run 100K Items Test

1. Click the **"Test 100K Items"** button
2. Wait for the test to complete (~30-40 seconds)
3. Record the results below

### 3. Optional: Run Multiple Times

For more accurate results, run each test 2-3 times and take the average.

---

## Results Template

### 10K Items Test

**Run 1:**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%
- Rating: _____ (good/ok/bad)

**Run 2 (optional):**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%
- Rating: _____ (good/ok/bad)

**Average (if multiple runs):**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%

---

### 100K Items Test

**Run 1:**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%
- Rating: _____ (good/ok/bad)

**Run 2 (optional):**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%
- Rating: _____ (good/ok/bad)

**Average (if multiple runs):**
- Baseline Memory: _____ MB
- Optimized Memory: _____ MB
- Memory Saved: _____ MB
- Reduction: _____%

---

## Expected Results

Based on the implementation, we expect:

### 10K Items
- **Baseline:** ~1.0 MB
- **Optimized:** ~0.3-0.5 MB
- **Savings:** ~0.5-0.7 MB (50-70% reduction)

### 100K Items
- **Baseline:** ~3.7-4.3 MB (previously measured)
- **Optimized:** ~0.5-1.5 MB
- **Savings:** ~2-3 MB (50-75% reduction)
- **Target:** Competitive with react-window (~0.55 MB)

---

## Rating Guidelines

The test page automatically rates results:

### Savings Percentage
- ✅ **Good:** ≥50% reduction
- ⚠️ **OK:** 25-49% reduction
- ❌ **Bad:** <25% reduction

### Memory Usage (100K items)
- ✅ **Good:** <2 MB
- ⚠️ **OK:** 2-5 MB
- ❌ **Bad:** >5 MB

---

## Analysis Questions

After recording results, answer these questions:

### 1. Did optimization flags work?
- [ ] Yes - Memory reduced by 50-75% as expected
- [ ] Partially - Some reduction but less than expected
- [ ] No - Little to no memory reduction

### 2. Is memory competitive with react-window?
- [ ] Yes - Optimized memory is ~0.5-1 MB (within 2x of react-window)
- [ ] Close - Optimized memory is 1-2 MB (within 4x)
- [ ] No - Still significantly higher than react-window

### 3. Are there any issues?
- [ ] Memory API not available (need --enable-precise-memory-info)
- [ ] Test failed with errors
- [ ] Results seem inconsistent between runs
- [ ] No issues - tests ran smoothly

### 4. Performance observations
- [ ] Tests ran quickly and smoothly
- [ ] Tests felt slow or laggy
- [ ] Browser became unresponsive

---

## Troubleshooting

### Memory API Not Available

If you see "Memory API Not Available" error:

1. Close all Chrome windows
2. Run the script again: `./run-memory-test.sh`
3. The script automatically adds `--enable-precise-memory-info` flag

Or manually open Chrome:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --enable-precise-memory-info \
  http://localhost:3338/test-memory-optimization.html
```

### Test Hangs or Freezes

1. Refresh the page (⌘R)
2. Try with smaller test first (10K items)
3. Check browser console for errors (⌘⌥J)

### Inconsistent Results

Memory measurements can vary ±10-20% due to:
- Garbage collection timing
- Background browser activity
- System memory pressure

Solution: Run tests 2-3 times and average the results.

---

## Next Steps

### If Results Are Good (50-75% reduction)

1. Update `memory-baseline-measurements.md` with actual results
2. Document success in the "Optimization Results" section
3. Create user-facing documentation for the flags
4. Update README with memory optimization guidance
5. Consider making optimizations default in future versions

### If Results Are Not As Expected (<50% reduction)

1. Investigate why flags aren't having expected impact
2. Check if benchmark is actually using the flags (add console.log)
3. Profile with Chrome DevTools to see what's consuming memory:
   - Open DevTools (⌘⌥I)
   - Go to Memory tab
   - Take heap snapshot before and after vlist creation
   - Compare object counts and sizes
4. Review implementation in `vlist/src/builder/core.ts`
5. Consider other memory optimization approaches

---

## Chrome DevTools Profiling (Advanced)

For detailed memory analysis:

1. Open DevTools: ⌘⌥I
2. Go to **Memory** tab
3. Select "Heap snapshot"
4. **Before test:** Take snapshot
5. Click "Test 100K Items"
6. **After baseline:** Take snapshot
7. **After optimized:** Take snapshot
8. Compare snapshots to see:
   - Object counts
   - Memory retained
   - Which objects are using memory

Look for:
- Large arrays (items array copy)
- Map objects (idToIndex map)
- Unexpected retained objects

---

## Documentation Updates

After completing tests, update these files:

1. **memory-baseline-measurements.md**
   - Add "Optimization Results" section
   - Include actual measurements from both configs
   - Calculate and document savings

2. **vlist/README.md** (if successful)
   - Add "Memory Optimization" section
   - Document the two config flags
   - Provide usage examples
   - Explain trade-offs

3. **NEXT_SESSION.md**
   - Mark this task as complete
   - Add next steps based on results

---

## Contact

If you encounter issues or need help interpreting results:
- Check `vlist/src/builder/types.ts` for flag documentation
- Review implementation in `vlist/src/builder/core.ts`
- See `memory-performance-roadmap.md` for full context

---

Good luck! 🚀