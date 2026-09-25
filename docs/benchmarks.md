---
created: 2026-02-10
updated: 2026-09-22
status: published
---

# Benchmarks

## Quick start

```bash
bun run bench                    # default: all suites @ 10K + 100K
bun run bench --quick            # smoke: render + scrollto @ 10K
bun run bench --full             # full: all suites @ 10K + 100K + 1M
bun run bench --compare          # run + compare against baseline
bun run bench --store            # run + store to SQLite
bun run bench --suite=render     # single suite
bun run bench --items=100000     # custom item count
bun run bench --dry-run          # validate environment only
```

| Mode | Suites | Item counts | Use case |
|------|--------|-------------|----------|
| `--quick` | render, scrollto | 10K | PR smoke, quick local check |
| default | all 4 | 10K, 100K | Local dev, manual CI |
| `--full` | all 4 | 10K, 100K, 1M | Nightly, pre-release validation |

The wrapper starts the vlist.io server automatically if not already running. Set `VLIST_IO_DIR` to override the sibling path (default: `../vlist.io`).

## Architecture

All benchmarks run via the vlist.io CI runner (`benchmarks/ci/runner.mjs`), which uses Puppeteer to open benchmark pages and invoke the `globalThis.__vlistBenchmarks.runBenchmarks()` API. This is the same code path used by interactive benchmark pages and GitHub Actions CI.

```
bun run bench (vlist.v2)
      │
      ▼
benchmarks/ci/runner.mjs (vlist.io)
      │
      ▼
Puppeteer → Chrome → /benchmarks/{suite}?variant=vanilla
      │
      ▼
globalThis.__vlistBenchmarks.runBenchmarks()
      │
      ▼
benchmarks/results/latest.json
      │
      ├──→ bench:compare → comparison.md
      └──→ bench:store   → SQLite (ci_benchmark_runs)
```

One engine, one storage format, one baseline — local and CI use the same path.

## CI integration

Library PRs automatically trigger benchmarks via `.github/workflows/bench.yml`, which calls the vlist.io `perf.yml` workflow. Results are posted as sticky PR comments.

## Suites

| Suite | Measures |
|-------|----------|
| Render | Time to create and render a list from scratch (median, p95) |
| Scroll | Frame budget at 120 FPS (avg FPS, frame budget, p95) |
| Memory | Heap after render, delta after scrolling |
| ScrollTo | `scrollToIndex()` latency (median, p95) |

## Browser (manual)

| Suite | URL |
|-------|-----|
| Render | http://localhost:3338/benchmarks/render |
| Scroll | http://localhost:3338/benchmarks/scroll |
| Memory | http://localhost:3338/benchmarks/memory |
| ScrollTo | http://localhost:3338/benchmarks/scrollto |

Append `?variant=react|vue|svelte|solidjs` for framework variants.

On Vanilla, React, Vue, Svelte, and Solid the control bar has **Mode: Native | Synthetic**. The choice is remembered across suite and comparison pages, and a link can pin it with `?entry=synthetic`.

## Native and synthetic

**Native** creates the list from `vlist`. **Synthetic** creates it from `vlist/synthetic`. The other library in a comparison never changes.

| Page | Native | Synthetic |
|------|--------|-----------|
| Initial Render | Time to first paint | Same measurement, `vlist/synthetic` |
| Scroll FPS | Position write (`ctx.scroll.to`), then the rows are checked each frame | The same driver and the same checks |
| Memory | Heap after render, then after a scroll | The scroll goes through the position setter. `scrollTop` would leave a synthetic list still. |
| ScrollTo | `scrollToIndex` until the browser scroll offset settles | `scrollToIndex` until the list position settles. The browser offset stays at 0. |
| Comparisons | vlist side uses `vlist` and the browser scroll offset | vlist side uses `vlist/synthetic` and the position write. The other library keeps its own scroll. |

Scroll FPS on the page is that matched position-write run. CI still runs `scroll-vanilla`, which writes `scrollTop` and reports frame budget. Those are different measurements. The page does not run `scroll-vanilla`.

Framework suites pass `factory` through the adapter (`useVList({ factory })`). SolidJS Scroll FPS, Initial Render, and ScrollTo call the entry directly, which is how those three already measured. SolidJS Memory goes through the adapter.

## History

Two tables, two pages. A run never crosses from one to the other.

| What ran | Table | Page |
|----------|-------|------|
| vlist alone (Render, Scroll, Memory, ScrollTo) | `benchmark_runs` | http://localhost:3338/benchmarks/suite-history |
| vlist against another library | `comparison_runs` | http://localhost:3338/benchmarks/history |

Both tables have a `mode` column, `native` or `synthetic`. The suite id does not encode the mode.

A Scroll FPS run on Vanilla is saved as `scroll-vanilla`. On React it is `scroll-react`. Native and synthetic are two series of that same suite. Render, Memory, and ScrollTo follow the same pattern (`render-vanilla`, `memory-react`, `scrollto-vue`).

A comparison is saved under the other library's id. `react-window` with `mode = synthetic` is react-window against `vlist/synthetic`. The react-window side is the same as the native series.

Older suite rows that used ids such as `render-synthetic` or `scroll-logical-native` are folded into the suite above, and `mode` is set from the old id. A synthetic comparison that was briefly stored as `react-window-synthetic` in the suite table is moved to `comparison_runs` as `react-window` / `synthetic`.

Both history pages have a Mode filter. It is the only native/synthetic split in the suite list. The list itself is the measurement and the framework: Render, Scroll, Memory, ScrollTo.

## Baseline workflow

1. Run `bun run bench --compare` on `staging` before changes
2. Make changes, bump version
3. Run `bun run bench --compare --store` — compare against baseline and store results
4. Baseline is at `vlist.io/benchmarks/baselines/main.json` — refresh only on version releases

## Reference baseline (v2.0.1, 10K items, vanilla)

| Suite | Metric | Value | Rating |
|-------|--------|-------|--------|
| Render | Median | 8.3 ms | good |
| Render | p95 | 8.7 ms | good |
| Scroll | Avg FPS | 120 fps | good |
| Scroll | Frame budget | 0.82 ms | good |
| Scroll | Budget p95 | 0.80 ms | good |
| Memory | After render | 0.11 MB | good |
| Memory | Scroll delta | -0.55 MB | good |
| ScrollTo | Median | 41.6 ms | good |
| ScrollTo | p95 | 42.3 ms | good |

Captured 2026-05-23 on macOS, Chrome, Puppeteer headless.
