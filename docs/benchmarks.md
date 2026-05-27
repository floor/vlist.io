---
created: 2026-02-10
updated: 2026-05-27
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
