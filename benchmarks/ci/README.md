# Headless Performance Workflow

This directory contains the automated benchmark harness for vlist.io.

The harness reuses the browser benchmark engine already used by the interactive
benchmark pages. Puppeteer opens the local benchmark page, calls the exposed
`globalThis.__vlistBenchmarks.runBenchmarks()` API, and writes machine-readable
results plus a Markdown summary.

## Commands

Run the default smoke set:

```sh
bun run bench:ci
```

Run a narrow local smoke test:

```sh
bun run bench:ci -- --skip-build --item-counts=1000 --suites=render-vanilla
```

Compare the latest run against an optional baseline:

```sh
bun run bench:compare -- --baseline=benchmarks/baselines/main.json
```

Store the latest run in the CI-owned SQLite tables:

```sh
bun run bench:store
```

Build the sticky PR comment body:

```sh
bun run bench:comment
```

## Output

Generated files are ignored by git:

- `benchmarks/results/latest.json`
- `benchmarks/results/<timestamp>.json`
- `benchmarks/results/summary.md`
- `benchmarks/results/comparison.md`
- `benchmarks/results/pr-comment.md`

CI storage writes to `data/benchmarks.db` by default, using
`ci_benchmark_runs` and `ci_benchmark_metrics`. These tables are separate from
the public crowdsourced benchmark tables.

## CI Shape

The GitHub workflow is intentionally non-blocking at first. It posts a sticky PR
comment and uploads artifacts so we can observe benchmark noise before turning
any budget into a hard gate.

The current PR smoke job runs:

- `render-vanilla`
- `scrollto-vanilla`

The broader default config in `config.json` also includes `scroll-vanilla` and
`memory-vanilla`, which are better suited to nightly or manual runs.

### RFC-014 input scenarios and isolated artifacts

Set `VLIST_BENCH_ROOT` to an absolute path containing the chosen vlist build
(`dist/index.js`, `dist/config.js`, CSS and optionally `dist/synthetic.js`) when
running `bun run build:bench`. An explicit root fails on missing artifacts instead
of falling back to the main checkout. Ensure the site's worktree dependency/CSS
also resolves to the selected build when serving the benchmark page.

The build defines `__BENCH_HAS_SYNTHETIC__` from the presence of that build's
`dist/synthetic.js`. Pre-RFC builds omit synthetic suite registration and get a
throwing import stub; they never benchmark native mode under a synthetic label.

Select `scroll-logical-native`, `scroll-logical-bounded` and
`scroll-logical-synthetic` for matched absolute logical writes. “Input JS” is
synchronous setter time only; native rendering can be deferred, so these values
are not a comparison of total rendering or main-thread cost.

Select `scroll-fling-synthetic` to exercise pointer dispatch, axis intent,
velocity sampling and inertia through repeated back-and-forth gestures. It waits
for three unchanged frames between flings, rejects zero inertia or native
main-axis movement, and reports FPS, dropped frames, frame p95/max, frames over
32 ms, inertia frames and distance per fling. Events use real monotonic browser
`timeStamp`s at a nominal 16 ms cadence. Because in-page PointerEvents do not own a
browser pointer ID, this scenario temporarily shims capture methods and restores
them afterward. It does not verify trusted capture, touch-action, native gesture
arbitration or physical-device feel; those remain CDP/device checks.

These suite IDs currently have no numerical thresholds in `ci/config.json`.
Failed motion/native-offset invariants fail the run; “no budget regressions” from
`bench:compare` does not establish a timing budget for these new scenarios.

When invoking the vlist wrapper from a library worktree, use `VLIST_IO_DIR` for the
site worktree and a free `VLIST_BENCH_PORT` (for example, 3397). An explicit port is
never reused. Set `BENCH_GIT_SHA` to identify the measured library revision and
`BENCH_OUTPUT_DIR` to keep each run's raw JSON separate.
