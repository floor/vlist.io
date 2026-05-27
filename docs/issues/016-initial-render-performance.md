---
id: "016"
title: Initial render 2x slower than react-window on virtuallist.io benchmark
severity: medium
status: open
component: core, pipeline
related: []
---

# Issue 016: Initial render 2x slower than react-window on virtuallist.io benchmark

---

## Symptom

On virtuallist.io benchmarks (10K items, 48px height, overscan 5, headless Chrome), vlist's initial render median is ~2.2ms vs react-window ~1.1ms and legend-list ~0.7ms. The measurement wraps the entire `createVList()` call.

## Benchmark data (default intensity, 3 runs)

| Library | Render (median) | Render Min |
|---------|----------------|------------|
| vlist | 2.0–2.4ms | 1.2–1.9ms |
| react-window | 1.0–1.2ms | 0.5–0.8ms |
| legend-list | 0.5–0.8ms | 0.4–0.5ms |

## What's measured

The benchmark calls `createVList({ container, items, overscan, item: { height, template } })` inside `measureDuration()`. This includes:

1. Config resolution (trivial)
2. `createDOMStructure` — insertAdjacentHTML for 3 nested divs
3. `createSizeCache` — fixed-size cache, O(1) (just a closure)
4. `createPool` — one createElement + class
5. `createEngineState` — 3 TypedArray allocations (~104 entries each)
6. `createScrollHandler` — closure creation (no event attachment yet)
7. `createEmitter` — empty Map/Set
8. `state.containerSize = dom.viewport.clientHeight` — forces reflow on new DOM
9. `phase1Calculate` — fills TypedArrays (O(visible items))
10. `phase2Commit` — standard path: N × (cloneNode + innerHTML + 6 setAttribute + 2 style + appendChild) via DocumentFragment

React libraries measure only `createRoot` (lightweight) + `flushSync(root.render(...))`.

## Root cause analysis

The overhead comes from two sources:

### 1. Initialization machinery (~0.3–0.5ms)

vlist creates state that React libraries don't need upfront: TypedArray buffers, scroll handler, emitter, pool template, DOM structure with forced reflow. React's `createRoot` is near-zero; all work happens inside the render.

### 2. Rendering approach (~1.5–2.0ms for ~20 items)

vlist's per-item cost in the standard path: `pool.acquire()` (cloneNode) + `innerHTML` (parse ~200 bytes) + 6 `setAttribute` calls + 2 style assignments + `fragment.appendChild`. That's ~11 DOM API calls per item.

React's reconciler creates DOM directly from virtual DOM objects without HTML parsing — `document.createElement` + property assignment. No HTML tokenizer/parser involved.

## Approaches explored (no measurable gain)

1. **Batch HTML (insertAdjacentHTML for all items at once)** — Builds one HTML string with all items and parses in a single call. Showed ~0.7ms improvement in some runs but results were too noisy to confirm. Adds 0.5KB to bundle. Reverted.

2. **Hybrid (minimal HTML + post-parse setAttribute)** — Smaller HTML string (class + style only) then setAttribute in child-walk loop. Was ~0.5ms SLOWER than full batch HTML — proves that baking attributes into the HTML parser is faster than individual setAttribute calls.

3. **Read container size from parent (avoid reflow)** — Read from already-laid-out container instead of newly-created viewport. No measurable improvement (~50–100µs savings at most).

## Possible future approaches

- **Defer ARIA attributes** — Skip id, aria-posinset, aria-setsize on first paint, add on idle. Saves 3 setAttribute per item but breaks accessibility guarantees.
- **Pre-warm JIT** — The batch HTML path showed bimodal timing (first 2 iterations slow, rest fast), suggesting V8 JIT warmup. Could explore ways to pre-compile the hot path.
- **Reduce `createVList` scope** — Extract render-only factory for benchmarks that skips scroll handler, emitter, pool. Not useful in production.
- **Template pre-rendering** — If template output is deterministic per-index, cache results across warmup iterations. Benchmark-specific, not general.

## How benchmarks were run

All measurements used the virtuallist.io benchmark infrastructure, which depends on the local vlist via `"vlist": "file:../vlist"` in package.json. The file watcher auto-rebuilds vlist on source changes.

```bash
# From the virtuallist.io repo root:
bun run scripts/benchmark.ts --library vlist,react-window,legend-list --intensity default --runs 3
```

**What this does:**
1. Launches headless Chrome via Puppeteer
2. For each library × run: navigates to the benchmark page, loads the library adapter
3. Warmup phase: 2 iterations of create → destroy (not measured, primes JIT/caches)
4. Measure phase: 7 iterations of `measureDuration(async () => adapter.create(container, 10000))`
5. Each iteration: creates a fresh container (600px height), times the full `create()` call using `performance.mark/measure`, destroys the instance
6. Reports median, min, and p95 of the 7 measured durations

**Intensity presets** (warmup / render iterations):
- `quick`: 1 / 3 — fast feedback, very noisy
- `default`: 2 / 7 — standard
- `full`: 3 / 9 — most stable

**What `create()` measures per library:**
- vlist: `createVList({ container, items, overscan, item: { height, template } })` — synchronous, all-inclusive
- react-window: `createRoot(container)` + `flushSync(() => root.render(...))` — synchronous via flushSync
- legend-list: same pattern as react-window

**Key: all React adapters use `flushSync`** to force synchronous rendering. Without it, React's async reconciliation completes AFTER the timer stops, giving artificially low numbers. This was fixed in this session (all 7 React adapters, 2 Vue adapters with `nextTick`, 1 Solid adapter with microtask await).

## Conclusion

The ~2x render gap is structural: vlist initializes a full scroll engine on every `createVList()` call, and uses HTML string parsing for DOM creation. React's reconciler creates DOM without parsing. This tradeoff buys vlist zero-allocation scroll performance, 168x less memory, and 3–30x faster jump-to-index — but initial render will always lag behind React's optimized reconciler for small item counts (~20 visible items).
