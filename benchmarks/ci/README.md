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
