---
id: "014"
title: V8 in-memory code cache inflates heap measurements after watch-mode builds
severity: moderate
status: resolved
component: benchmarks
related: ["013"]
---

# Issue 014: V8 in-memory code cache inflates heap measurements after watch-mode builds

---

## Symptom

The v2 memory benchmark reported **108 MB total heap** vs v1's **6 MB** — a 17x regression. Debug logging showed the page heap was already 107.83 MB *before any benchmark code ran*. GC could not reclaim it. After 10 seconds of scrolling, the heap dropped to 6.27 MB as V8 discarded compiled code during idle GC sweeps.

## Investigation

### Ruling out vlist v2

Both v1 and v2 benchmark bundles are ~1.6 MB minified, with identical structure (937 lines, same frameworks, same comparison libraries). Only 3 lines differ, totaling ~15 KB. The render delta (vlist's actual memory footprint) was 0.08 MB for v2 vs 0.07 MB for v1 — essentially identical.

### Ruling out benchmark code

The measurement engine was temporarily modified with a warmup cycle and heap stabilization. These changes were reverted to restore parity with v1's measurement code. The inflated heap persisted regardless of the measurement approach.

### Root cause: V8's in-memory code cache

During development, the benchmark was rebuilt in `--watch` mode, producing a **10 MB unminified bundle with inline sourcemaps** (vs 1.6 MB production). V8 compiled this entire bundle and retained the compiled code in its per-origin in-memory cache.

When the benchmark was later rebuilt in production mode (1.6 MB), V8 still held the compiled artifacts from the 10 MB bundle in memory. `performance.memory.usedJSHeapSize` includes V8's compiled code, so the baseline read ~108 MB — the compilation overhead from the larger bundle.

Key evidence:
- `no-cache, no-store` headers prevent HTTP disk caching but not V8's in-memory compile cache
- Restarting the browser cleared the in-memory cache
- After restart, v2 showed **5.7 MB total heap** — matching v1's 5.9 MB

### Failed approaches investigated

1. **Warmup cycle** — Created a throwaway render+scroll to force V8 Turbofan compilation before measurement. Stabilized scroll deltas but inflated the baseline further.
2. **Heap stabilization loop** — Looped GC + measure until consecutive readings converged. Partially effective for noise but couldn't address the cached compiled code.
3. **Code splitting** — Dynamic imports with Bun's `splitting: true`. Produced 61 chunks and *increased* heap to 52 MB due to per-module V8 overhead.

## Resolution

No code fix required. The issue is a V8 browser behavior, not a library or benchmark bug. The inflated heap clears on browser restart.

### Guidance for accurate measurements

- **Always restart the browser** before comparing memory benchmarks across library versions
- **Use production builds** (`bun run build:bench` without `--watch`) for memory measurements
- **The render delta** ("After render" metric) is the reliable comparison metric — it measures only vlist's allocation, not V8's compilation overhead
- **Total heap** is informational but varies with V8's compilation state and is not suitable for cross-version comparison

## Results (after browser restart, production builds)

| Metric | v1 (1.9.1) | v2 (2.0.0) |
|--------|-----------|------------|
| After render | 0.07 MB | 0.08 MB |
| Scroll delta | -0.63 MB | 0.02 MB |
| Total heap | 5.9 MB | 5.7 MB |

v2 is on par with v1. No memory regression.

## Status

**Resolved** — no code changes needed. Root cause is V8 browser behavior.
