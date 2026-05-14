---
created: 2026-05-14
updated: 2026-05-14
status: draft
---

# Automated Performance Workflow

This document describes the headless performance workflow for vlist and vlist.io.
It is meant for contributors and automation agents working on runtime speed,
memory efficiency, scroll behavior, and regression tracking.

The short public overview lives in [Benchmarks](../resources/benchmarks.md). This
document is the operational guide.

---

## Goals

The automated workflow should:

- reuse the same benchmark engine as the interactive `/benchmarks/*` pages
- run from a single command locally and in GitHub Actions
- produce machine-readable JSON and human-readable Markdown
- compare current results against a known-good baseline
- avoid blocking PRs until benchmark noise is understood
- support a small PR smoke set and a larger nightly/manual matrix

The workflow is not only about bundle size. It covers:

- initial render latency
- scroll throughput and frame budget
- `scrollToIndex()` latency
- memory after render
- memory delta after sustained scrolling

---

## Architecture

```text
bun run bench:ci
        |
        v
benchmarks/ci/runner.mjs
        |
        v
build vlist + vlist.io benchmarks
        |
        v
start local vlist.io server
        |
        v
launch Chrome with Puppeteer
        |
        v
open /benchmarks/render?variant=vanilla
        |
        v
globalThis.__vlistBenchmarks.runBenchmarks(...)
        |
        v
benchmarks/results/latest.json
benchmarks/results/summary.md
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

This keeps the automated path honest: it does not reimplement benchmark logic in
Node. Puppeteer only drives Chrome and collects results.

---

## Commands

Run the default CI set:

```bash
bun run bench:ci
```

Run the fast PR smoke set:

```bash
bun run bench:ci -- --item-counts=10000 --suites=render-vanilla,scrollto-vanilla
```

Run a tiny local smoke test without rebuilding:

```bash
bun run bench:ci -- --skip-build --item-counts=1000 --suites=render-vanilla
```

Compare the latest run against the checked-in baseline:

```bash
bun run bench:compare -- --baseline=benchmarks/baselines/main.json
```

Use a running external server:

```bash
bun run bench:ci -- --url=http://127.0.0.1:3338 --skip-build
```

Useful environment variables:

| Variable | Purpose |
|----------|---------|
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
| `benchmarks/ci/store.mjs` | Stores CI runs in SQLite |
| `benchmarks/ci/config.json` | Default suites, item counts, and budget thresholds |
| `benchmarks/ci/README.md` | Short command reference |
| `benchmarks/baselines/main.json` | Checked-in known-good baseline |
| `benchmarks/results/.gitignore` | Keeps generated artifacts out of git |
| `.github/workflows/perf.yml` | Non-blocking PR smoke workflow |

Generated artifacts:

| File | Purpose |
|------|---------|
| `benchmarks/results/latest.json` | Most recent machine-readable run |
| `benchmarks/results/<timestamp>.json` | Local history copy |
| `benchmarks/results/summary.md` | Current run summary |
| `benchmarks/results/comparison.md` | Current vs baseline report |

---

## SQLite Storage

CI results are stored in separate SQLite tables:

- `ci_benchmark_runs`
- `ci_benchmark_metrics`

They intentionally do not mix with the public `benchmark_*` or `comparison_*`
tables used by crowdsourced browser runs.

Store the latest artifact:

```bash
bun run bench:store
```

Use a temporary database for local testing:

```bash
bun run bench:store -- --db=benchmarks/results/ci-test.db
```

Each CI run stores:

- vlist version
- suite ID and item count
- metric values
- benchmark config (`stressMs`, `scrollSpeed`)
- browser environment
- git SHA, branch, PR number, workflow run ID, runner OS, and baseline SHA when available

Stored runs are visible at `/benchmarks/ci-results`, a contributor-facing view over the CI tables. It shows the latest runs, branch/suite/item-count filters, workflow metadata when available, and the metric values captured for each run.

Artifacts remain useful for PR review. SQLite is the long-term trend store.

---

## Current Smoke Set

The PR workflow currently runs:

- `render-vanilla`
- `scrollto-vanilla`
- `10_000` items

This is intentionally small. It confirms the harness works and catches obvious
render/scrollTo regressions without turning every PR into a long performance
job.

The default local config also includes:

- `scroll-vanilla`
- `memory-vanilla`

These are more sensitive to browser and machine noise, so they are better suited
to nightly or manual runs until we have enough samples.

---

## Baseline Policy

`benchmarks/baselines/main.json` is the known-good comparison point.

Refresh it only when:

- measuring from a clean, known-good branch
- the benchmark methodology changed intentionally
- an accepted optimization legitimately improves or changes the baseline
- the baseline is stale after dependency/runtime changes

Do not refresh it just to hide a regression.

Recommended refresh flow:

```bash
git switch staging
bun run build:bench
bun run bench:ci -- --skip-build --item-counts=10000 --suites=render-vanilla,scrollto-vanilla
cp benchmarks/results/latest.json benchmarks/baselines/main.json
bun run bench:compare -- --baseline=benchmarks/baselines/main.json
```

Commit the baseline update separately from unrelated performance changes when
possible.

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

The PR workflow:

1. checks out `vlist.io`
2. clones sibling `floor/vlist` into `../vlist`
3. installs dependencies with Puppeteer browser download skipped
4. installs Chrome explicitly
5. runs the PR smoke benchmark
6. generates comparison Markdown
7. stores CI results in SQLite
8. posts or updates a sticky PR comment
9. uploads artifacts

It is intentionally non-blocking while the team observes variance. The sticky PR
comment is generated with:

```bash
bun run bench:comment
```

The comment body is written to `benchmarks/results/pr-comment.md` and includes a
hidden marker so the workflow updates the existing performance comment instead
of creating a new comment on every push.

Next CI steps:

- add a nightly workflow for broader suite coverage
- store nightly artifacts for trend analysis
- optionally open/update GitHub issues when regressions persist

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

Medium-term:

- add bundle-size artifacts to the same perf report
- compare against previous successful workflow artifact
- track memory metrics separately from speed metrics
- add persistent trend storage for CI-owned runs

Long-term:

- split perf issues by `perf:bundle-size`, `perf:memory`, `perf:runtime`, and `perf:scrolling`
- create a dashboard from CI artifacts and crowdsourced data
- fail PRs only for high-confidence, repeated regressions
