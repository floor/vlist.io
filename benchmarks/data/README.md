# Benchmark Data Files

This directory contains static data for benchmark comparison pages and the SQLite database for crowdsourced results. Data is separated from code for easier maintenance and updates.

## Files

### `benchmarks.db`
SQLite database for crowdsourced benchmark results. Created by the seed script and populated automatically as visitors run benchmarks on the site.

**Two separate table pairs:**

| Tables | Purpose | Populated by |
|--------|---------|--------------|
| `comparison_runs` + `comparison_metrics` | Library comparison results (react-window, virtua, etc.) | Running any comparison benchmark |
| `benchmark_runs` + `benchmark_metrics` | vlist suite results (render, scroll, memory, scrollto) | Running any vlist suite benchmark |

Both pairs have identical column structure — they are separate so queries never cross-contaminate.

**Runs table columns:**
- `id`, `created_at` — identity
- `version`, `suite_id`, `item_count` — what was tested
- `user_agent`, `hardware_concurrency`, `device_memory`, `screen_width`, `screen_height` — environment
- `duration_ms`, `success`, `error` — run metadata
- `stress_ms`, `scroll_speed` — config

**Metrics table columns:**
- `run_id` — FK to the runs table
- `label`, `value`, `unit`, `better`, `rating` — metric data

**Setup:**
```bash
# Create the database (run once)
bun run seed:benchmarks

# Recreate from scratch (drops existing data)
bun run seed:benchmarks -- --force
```

**API endpoints** (default to comparison tables, use `?type=suite` for suite tables):
- `POST /api/benchmarks` — auto-routes to correct tables by suite ID
- `GET /api/benchmarks/summary` — high-level overview
- `GET /api/benchmarks/stats` — aggregated stats with filters
- `GET /api/benchmarks/history` — time-series data for charts
- `GET /api/benchmarks/versions` — all known versions
- `GET /api/benchmarks/suites` — all known suite IDs
- `GET /api/benchmarks/browsers` — browser breakdown

**Used in:** `/benchmarks/history` (Comparison History page)

**History page UI:** The history page presents crowdsourced data using the same metric card layout as live benchmark results — each metric shows the **median** value with color-coded ratings and contextual notes (e.g. "vlist is faster"). A confidence badge indicates data reliability (🟢 ≥20 runs, 🟡 5–19, ⚪ <5). Full statistical details (mean, p5, p95, stddev) are available via a collapsible "Show detailed stats" toggle. A contribute CTA at the bottom links to all comparison benchmarks.

**Note:** This file is `.gitignored` — each environment creates its own via the seed script.

---

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

- **Static files are verified** — No estimates or guesses
- **Reproducible** — Anyone can verify these numbers
- **JSON files are static** — Updated manually, not auto-generated
- **benchmarks.db is dynamic** — Populated automatically by visitor benchmark runs
- **Versioned** — JSON changes tracked in git history; DB is gitignored (recreated per environment)
- **Documented** — Each value has a clear source

For questions or updates, see `benchmarks/comparison/README.md`
