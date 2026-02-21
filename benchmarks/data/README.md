# Benchmark Data Files

This directory contains static data for benchmark comparison pages. Data is separated from code for easier maintenance and updates.

## Files

### `bundle.json`
Bundle size data for library comparison.

**Format:**
```json
[
  {
    "lib": "library-name",
    "gzip": "13.9",      // Gzipped size in KB
    "min": "42.3",       // Minified size in KB
    "deps": "0",         // Number of dependencies
    "self": true,        // true = vlist, false = competitor
    "note": "Description of the library variant"
  }
]
```

**When to update:**
- After vlist version releases
- When library versions change
- Verify sizes with bundlephobia.com or local builds

**Used in:** `/benchmarks/bundle`

---

### `performance.json`
Performance benchmark results (10K items) for library comparison.

**Format:**
```json
[
  {
    "lib": "library-name",
    "renderTime": "8.5",     // Initial render time (ms)
    "memory": "0.24",        // Memory usage (MB)
    "scrollFPS": "120.5",    // Scroll frames per second
    "p95Frame": "9.2",       // P95 frame time (ms)
    "ecosystem": "Vanilla JS", // Framework ecosystem
    "self": true             // true = vlist, false = competitor
  }
]
```

**When to update:**
- After running benchmarks on standardized hardware
- When vlist performance improves
- When updating competitor library versions

**Methodology:**
- Run each benchmark at 10K items
- Chrome with `--enable-precise-memory-info`
- Take median of 5 iterations
- Consistent hardware (same CPU/GPU)

**Used in:** `/benchmarks/performance-comparison`

---

### `features.json`
Feature comparison matrix across libraries.

**Format:**
```json
{
  "libraries": ["vlist", "vlist/core", "@tanstack/virtual", "react-window", "react-virtuoso"],
  "features": [
    {
      "name": "Feature name",
      "support": ["✅", "✅", "✅", "❌", "⚠️"]
    }
  ]
}
```

**Symbols:**
- ✅ = Fully supported
- ⚠️ = Partial support
- ❌ = Not supported
- — = Not applicable

**When to update:**
- When vlist adds new features
- When competitor libraries add features
- When reviewing library documentation

**Used in:** `/benchmarks/features`

---

## Updating Data

### Bundle Sizes
```bash
# Measure vlist
bun run build
ls -lh vlist/dist/*.js

# Verify with bundlephobia
open https://bundlephobia.com/package/vlist@latest
```

### Performance Results
```bash
# Run benchmarks in Chrome (full metrics mode)
bun run dev
open http://localhost:3338/benchmarks/react-window
# Click "Run" for 10K items
# Copy results to performance.json
```

### Features
- Review library documentation
- Test features manually
- Update support matrix

---

## Notes

- **All data is verified** - No estimates or guesses
- **Reproducible** - Anyone can verify these numbers
- **Static** - Updated manually, not auto-generated
- **Versioned** - Changes tracked in git history
- **Documented** - Each value has a clear source

For questions or updates, see `benchmarks/comparison/README.md`
