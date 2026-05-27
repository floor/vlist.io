---
created: 2026-05-14
updated: 2026-05-23
status: active
---

# Automated Performance Workflow

This document describes the headless performance workflow for vlist and vlist.io.
It is meant for contributors and automation agents working on runtime speed,
memory efficiency, scroll behavior, and regression tracking.

The short public overview lives in [Benchmarks](../resources/benchmarks.md). This
document is the operational guide.

Design decisions are recorded in [ADR: Normalized Benchmark Workflow](https://github.com/floor/vlist/discussions/81).

---

## Principles

One engine, one storage, one baseline.

- **One engine:** `benchmarks/ci/runner.mjs` — uses `globalThis.__vlistBenchmarks.runBenchmarks()`, the same code path as interactive pages and CI.
- **One storage:** SQLite `ci_benchmark_runs` / `ci_benchmark_metrics` tables. Both local and CI runs use the same schema.
- **One baseline:** `benchmarks/baselines/main.json` — refreshed on version releases.
- **One entry point from vlist:** `bun run bench` in the vlist repo — wraps the CI runner.

---

## Architecture

```text
bun run bench (vlist repo)          bun run bench:ci (vlist.io)
        │                                    │
        └──────────┬─────────────────────────┘
                   ▼
         benchmarks/ci/runner.mjs
                   │
                   ▼
         Puppeteer → Chrome → /benchmarks/{suite}?variant=vanilla
                   │
                   ▼
         globalThis.__vlistBenchmarks.runBenchmarks(...)
                   │
                   ▼
         benchmarks/results/latest.json + summary.md
                   │
         ┌─────────┼──────────┐
         ▼         ▼          ▼
    bench:compare  bench:store  bench:comment
         │         │          │
         ▼         ▼          ▼
    comparison.md  SQLite     pr-comment.md
                   (ci_*)     → sticky PR comment
```

The browser page exposes a small automation API:

```js
globalThis.__vlistBenchmarks = {
  getSuites,
  getSuite,
  runBenchmarks,
  version,
};
```

Puppeteer drives Chrome and collects results. It does not reimplement benchmark
logic in Node.

---

## Repositories

| Repository | Role |
|------------|------|
| `floor/vlist.io` | Benchmark engine, CI workflow, SQLite schema, baseline, result UI |
| `floor/vlist` | Library being benchmarked, `bun run bench` wrapper, cross-repo CI trigger |

In local development, `vlist.io` depends on `vlist` through `file:../vlist`.
GitHub Actions mirrors this by cloning `floor/vlist` into `../vlist`.

### Cross-repo trigger

`floor/vlist` has `.github/workflows/bench.yml` which calls `floor/vlist.io`'s
`perf.yml` as a reusable workflow via `workflow_call`:

```yaml
# floor/vlist/.github/workflows/bench.yml
jobs:
  benchmark:
    uses: floor/vlist.io/.github/workflows/perf.yml@main
    with:
      vlist_repository: ${{ github.repository }}
      vlist_ref: ${{ github.head_ref }}
      source_repository: ${{ github.repository }}
      source_pr_number: ${{ github.event.pull_request.number }}
```

This triggers automatically on vlist PRs that change `src/**` or `package.json`.

Manual dispatch from the vlist repo is also supported:

```bash
gh workflow run Performance \
  --repo floor/vlist.io \
  -f vlist_repository=floor/vlist \
  -f vlist_ref=my-branch \
  -f source_repository=floor/vlist \
  -f source_pr_number=123
```

---

## Commands

### From the vlist repo (recommended for developers)

```bash
bun run bench                    # full suite (render, scroll, scrollto, memory) @ 10K
bun run bench --quick            # smoke (render + scrollto) @ 10K — matches CI smoke
bun run bench --compare          # run + compare against baseline
bun run bench --store            # run + store to SQLite (opt-in)
bun run bench --suite=render     # single suite
bun run bench --items=100000     # custom item count
bun run bench --dry-run          # validate environment only
```

The wrapper auto-starts the vlist.io server if not running. Set `VLIST_IO_DIR`
to override the sibling path (default: `../vlist.io`).

### From vlist.io (CI runner directly)

```bash
bun run bench:ci                                                          # default config
bun run bench:ci -- --item-counts=10000 --suites=render-vanilla,scrollto-vanilla  # PR smoke
bun run bench:ci -- --skip-build --item-counts=1000 --suites=render-vanilla       # quick test
bun run bench:ci -- --url=http://127.0.0.1:3338 --skip-build                     # external server
bun run bench:compare -- --baseline=benchmarks/baselines/main.json               # compare
bun run bench:store                                                              # store to SQLite
bun run bench:comment                                                            # generate PR comment
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VLIST_IO_DIR` | Override vlist.io sibling path (vlist wrapper) |
| `BENCH_URL` | Use an existing server instead of starting one |
| `BENCH_SUITES` | Comma-separated suite IDs |
| `BENCH_ITEM_COUNTS` | Comma-separated item counts |
| `BENCH_OUTPUT_DIR` | Override result output directory |
| `BENCH_DB_PATH` | Override SQLite output path for `bench:store` |
| `BENCH_SKIP_BUILD=1` | Skip vlist and benchmark builds |
| `BENCH_HEADLESS=false` | Open visible Chrome for debugging |
| `PUPPETEER_EXECUTABLE_PATH` | Use a specific Chrome binary |
| `PUPPETEER_CHANNEL` | Use a Puppeteer browser channel |

---

## Files

| File | Purpose |
|------|---------|
| `benchmarks/ci/runner.mjs` | Puppeteer runner and artifact writer |
| `benchmarks/ci/compare.mjs` | Baseline comparison report |
| `benchmarks/ci/store.mjs` | Stores runs in SQLite |
| `benchmarks/ci/pr-comment.mjs` | Generates sticky PR comment |
| `benchmarks/ci/config.json` | Default suites, item counts, and budget thresholds |
| `benchmarks/ci/README.md` | Short command reference |
| `benchmarks/baselines/main.json` | Checked-in known-good baseline (v2.0.1) |
| `benchmarks/results/.gitignore` | Keeps generated artifacts out of git |
| `.github/workflows/perf.yml` | CI workflow (PR, manual dispatch, reusable workflow) |

Generated artifacts:

| File | Purpose |
|------|---------|
| `benchmarks/results/latest.json` | Most recent machine-readable run |
| `benchmarks/results/<timestamp>.json` | Local history copy |
| `benchmarks/results/summary.md` | Current run summary |
| `benchmarks/results/comparison.md` | Current vs baseline report |
| `benchmarks/results/pr-comment.md` | PR comment body |

### Deprecated

The following scripts are deprecated and will be removed in a future release.
Use `bun run bench` (vlist) or `bun run bench:ci` (vlist.io) instead.

| File | Replacement |
|------|-------------|
| `scripts/debug/tests/bench-suite.mjs` | `bun run bench:ci` |
| `scripts/debug/tests/memory-bench.mjs` | `bun run bench:ci --suites=memory-vanilla` |

---

## SQLite Storage

CI results are stored in separate SQLite tables:

- `ci_benchmark_runs` — one row per suite/itemCount execution
- `ci_benchmark_metrics` — individual metric rows (FK to runs)

They intentionally do not mix with the public `benchmark_*` or `comparison_*`
tables used by crowdsourced browser runs.

Each run stores:

- vlist version, suite ID, item count
- metric values (label, value, unit, rating)
- benchmark config (`stressMs`, `scrollSpeed`)
- browser environment (userAgent, hardwareConcurrency, deviceMemory)
- git SHA, branch, PR number, workflow run ID, runner OS, baseline SHA
- `source` — `"ci"` for GitHub Actions runs, `"local"` for `--store` runs

Local runs require `--store` to persist to SQLite. CI stores by default.
The `source` column separates local from CI data in trend analysis.

Stored runs are visible at `/benchmarks/ci-results`.

---

## Current Smoke Set

The PR workflow and `bun run bench --quick` both run:

- `render-vanilla`
- `scrollto-vanilla`
- `10_000` items

This is intentionally small. It confirms the harness works and catches obvious
regressions without turning every PR into a long performance job. Local quick
mode matches CI smoke exactly so developers can reproduce PR failures.

The full local config also includes `scroll-vanilla` and `memory-vanilla`,
which are more sensitive to machine noise.

---

## Baseline Policy

`benchmarks/baselines/main.json` is the known-good comparison point.
Currently pinned to vlist v2.0.1.

Refresh it only when:

- a new vlist version is released
- the benchmark methodology changed intentionally
- an accepted optimization legitimately changes the numbers
- the baseline is stale after dependency/runtime changes

Do not refresh it just to hide a regression.

The baseline should include metadata: vlist version, commit SHA, Chrome version,
and timestamp, so future comparisons are interpretable.

Recommended refresh flow:

```bash
git switch staging
bun run bench:ci -- --skip-build --item-counts=10000 --suites=render-vanilla,scrollto-vanilla
cp benchmarks/results/latest.json benchmarks/baselines/main.json
bun run bench:compare -- --baseline=benchmarks/baselines/main.json
```

Commit the baseline update separately from unrelated performance changes.

---

## Budget Policy

Budgets live in `benchmarks/ci/config.json`.

Current budgets are deliberately conservative and informational. The GitHub
workflow is `continue-on-error: true`, so failures are artifacts for review, not
merge blockers.

Before making budgets blocking:

1. Collect several runs on the same hardware/CI image.
2. Measure normal variance for each metric.
3. Ignore or loosen unstable metrics.
4. Gate only on large, repeated regressions.

Good candidates for early gates:

- `render-vanilla` median and p95
- `scrollto-vanilla` median and p95

Later candidates:

- scroll frame budget
- memory after render
- memory scroll delta

Memory should be treated carefully because `performance.memory` and GC timing are
noisy even with `--enable-precise-memory-info` and exposed `gc()`.

---

## GitHub Actions

### Triggers

The workflow file is `.github/workflows/perf.yml`. It runs in three cases:

1. **Reusable workflow** — called by `floor/vlist/.github/workflows/bench.yml`
   for library PRs. This is the primary cross-repo trigger.

2. **Manual dispatch** from GitHub Actions:

   ```bash
   gh workflow run Performance --ref staging
   ```

   Accepts optional inputs for cross-repository benchmarking:

   | Input | Default | Purpose |
   |-------|---------|---------|
   | `vlist_repository` | `floor/vlist` | Repository containing the package to benchmark |
   | `vlist_ref` | `main` | Branch, tag, or SHA to check out into `../vlist` |
   | `source_repository` | empty | Repository that requested the benchmark |
   | `source_pr_number` | empty | PR number in the source repository |

3. **Pull requests** to vlist.io that change benchmark-relevant files:

   ```yaml
   pull_request:
     paths:
       - "benchmarks/**"
       - "src/**"
       - "package.json"
       - "bun.lock"
   ```

### PR Workflow Steps

1. Checks out `vlist.io`
2. Clones sibling `floor/vlist` into `../vlist`
3. Installs dependencies (Puppeteer browser download skipped)
4. Installs Chrome explicitly
5. Runs the PR smoke benchmark
6. Generates comparison Markdown
7. Stores CI results in SQLite
8. Posts or updates a sticky PR comment
9. Uploads artifacts

Non-blocking while the team observes variance. The sticky PR comment includes a
hidden marker (`<!-- vlist-perf-comment -->`) so it updates in place.

---

## Recommended Automation Split

Use GitHub Issues as the source of truth. Use Codex/Claude to interpret and act
on benchmark artifacts.

Good recurring automations:

- daily: inspect latest perf artifacts and summarize regressions
- nightly: run broader suite matrix and upload artifacts
- weekly: review trend data and propose optimization issues
- PR: run smoke set and attach summary

Agents should not silently refresh baselines. Baseline updates need human review.

---

## Future Work

Near-term:

- add nightly workflow with `render`, `scroll`, `scrollto`, and `memory`
- run 10K and 100K item counts nightly
- collect several runs before enforcing budgets
- remove deprecated debug scripts after one release cycle

Medium-term:

- add bundle-size artifacts to the same perf report
- compare against previous successful workflow artifact
- track memory metrics separately from speed metrics

Long-term:

- split perf issues by `perf:bundle-size`, `perf:memory`, `perf:runtime`, and `perf:scrolling`
- create a dashboard from CI artifacts and crowdsourced data
- fail PRs only for high-confidence, repeated regressions
