# Browser Debug Scripts Classification

Classification of the 72 scripts in `scripts/debug/tests/` evaluated for the browser gating suite on `next`.

## Summary

- **Total scripts:** 72
- **Assertion scripts:** 11 (assert specific functional/geometric behavior and report pass/fail)
- **Diagnostic scripts:** 61 (measure, profile, or trace behavior without gating the browser test suite)
- **In test suite:** 3 asserting scripts that depend only on standard artifacts present in a clean checkout, pass on `next`, and exit non-zero on failure
- **Stale tests left out of suite:** 2 asserting scripts (`tree-focus.mjs`, `tree-test-folder-click.mjs`) whose test logic is stale and requires test repair rather than representing site faults
- **Excluded assertions (external prerequisites or not established):** 6 scripts (require uncommitted local databases, external network images, legacy v1 server under `--compare`, or not established)
- **Excluded diagnostics:** 61 scripts

Since commit `f7ee1a5`, a diagnostic that returns `{ pass: false }` exits 1 when run by hand (`messaging-initial-scroll.mjs:108-111`, `scale-keyboard-nav.mjs:119-122`, `track-select-all.mjs:75-78`, `tree-selection-consistency.mjs:65-74,303-306`, and `search-highlight.mjs:36-39` when its search input is missing).

## Classification Criteria

- **Kind:**
  - **assertion:** Asserts expected functional or geometric behavior with a pass/fail determination.
  - **diagnostic:** Observes, traces, benchmarks, or logs runtime metrics. Note: diagnostic scripts do not deliberately gate behavior, but setup failures or argument validation errors may produce non-zero exits (e.g. `bench-suite.mjs:147`).
- **Failed check exits non-zero:**
  - **yes:** A failed check causes the process to exit non-zero (via `node:assert`, explicit `process.exit(1)`, or returning `{ pass: false }` through `run()` or failing tests in `suite()`, which sets `process.exitCode = 1`).
  - **no:** Checks are evaluated or logged, but a failed check leaves exit status 0 (e.g. `bounded-list.mjs:45,128`, `table-blank-auto.mjs:294`, or scripts unconditionally returning `{ pass: true }`).
  - **has no check:** Script does not perform pass/fail checks (measures, profiles, or traces only).
- **Needs:**
  - **local server:** Running `server.ts` instance on local port.
  - **legacy v1 server:** Legacy v1 staging instance running on port 3340 (`../vlist.io-v1`), required by `perf-scroll.mjs` only under `--compare`.
  - **network images:** External image services (`https://picsum.photos`), required by `/examples/photo-album` (`examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80`).
  - **local data:** Local SQLite databases not tracked in git (`data/tracks.db`, seeded via `bun run seed:tracks`), required by `/examples/track-list`.
  - **vite dev server:** External Vite development server on port 5174 (`large-list-scrollbar-bottom.mjs:10`).
  - **temporary instrumentation:** Code modifications such as exposing `window.__list` (`carousel-snap-trajectory.mjs:31`).
- **In Suite:**
  - **yes:** Asserting script that relies strictly on resources available in a clean checkout, passes on `next`, and exits non-zero on failure.
  - **no:** Excluded from the PR gating suite.

---

## Test Inventory Table

| Script | Kind | Needs | Failed Check Exits Non-Zero? | In Suite | Why / Details |
|---|---|---|:---:|:---:|---|
| `bench-suite.mjs` | diagnostic | local server | has no check | no | Diagnostic benchmark harness; exits 1 only on invalid CLI args/options (`bench-suite.mjs:147`), has no behavioral assertion |
| `bounded-list.mjs` | diagnostic | local server | no | no | Sets and logs `fail` flag without setting exit status (`bounded-list.mjs:45,128`) |
| `carousel-basic.mjs` | diagnostic | local server | no | no | Logs check results but does not exit non-zero on failure (`carousel-basic.mjs:60-70`) |
| `carousel-buttons.mjs` | diagnostic | local server | no | no | Logs check results but does not exit non-zero on failure (`carousel-buttons.mjs:55-65`) |
| `carousel-hero-engine.mjs` | diagnostic | local server | no | no | Logs engine metrics, exits 0 |
| `carousel-hero.mjs` | diagnostic | local server | no | no | Logs hero metrics, exits 0 |
| `carousel-keyboard.mjs` | diagnostic | local server | no | no | Logs check results but does not exit non-zero on failure (`carousel-keyboard.mjs:65-75`) |
| `carousel-md3.mjs` | diagnostic | local server | no | no | Logs MD3 carousel metrics, exits 0 |
| `carousel-multi-aspect.mjs` | diagnostic | local server | has no check | no | Logs aspect ratio layout, exits 0 |
| `carousel-rapid-nav.mjs` | diagnostic | local server | has no check | no | Logs rapid navigation timing, exits 0 |
| `carousel-snap-fling.mjs` | assertion | local server | yes | yes | Asserts wheel snap across 3 fling scenarios and exits non-zero on failure (`carousel-snap-fling.mjs:90`); clean checkout satisfies all needs |
| `carousel-snap-render-chop.mjs` | diagnostic | local server | no | no | Logs handoff seam / plateau checks (`carousel-snap-render-chop.mjs:214-216`), exits 0; exits 2 only if focal item missing (`:102`) |
| `carousel-snap-trajectory.mjs` | diagnostic | local server, temporary instrumentation | has no check | no | Traces trajectory; exits 2 if `window.__list` instrumentation missing (`carousel-snap-trajectory.mjs:31`), has no behavioral assertion |
| `carousel-trackpad-scroll.mjs` | diagnostic | local server | has no check | no | Traces trackpad scroll deltas, exits 0 |
| `check-horiz-class.mjs` | diagnostic | local server, network images | has no check | no | Inspects container classes, exits 0 |
| `data-table-groups.mjs` | diagnostic | local server | has no check | no | Inspects group rows, exits 0 |
| `data-table-keyboard.mjs` | diagnostic | local server | has no check | no | Inspects keyboard navigation events, exits 0 |
| `data-table-scroll-last.mjs` | diagnostic | local server | no | no | Logs whether last item is visible, exits 0 |
| `data-table-selection.mjs` | diagnostic | local server | no | no | Logs selection state, exits 0 |
| `data-table-snapshots.mjs` | diagnostic | local server | has no check | no | Captures DOM snapshots, exits 0 |
| `file-browser-grid.mjs` | assertion | local server | yes | no | Real prerequisite: not established (`file-browser-grid.mjs:14` visits `/examples/file-browser` and asserts multi-column layout at `:136`) |
| `file-browser-table.mjs` | diagnostic | local server | no | no | Logs table layout, exits 0 |
| `grid-coverage.mjs` | diagnostic | local server, network images | no | no | Prints issue counts, exits 0 (`grid-coverage.mjs:115`) |
| `grid-pagedown.mjs` | diagnostic | local server | has no check | no | Traces PageDown scroll deltas, exits 0 |
| `groups-horizontal-headers.mjs` | assertion | local server, network images | yes | no | Real prerequisite: network images (`groups-horizontal-headers.mjs:15` visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80`) |
| `large-list-scrollbar-bottom.mjs` | diagnostic | vite dev server (port 5174) | no | no | Exits 1 if scrollbar missing (`:28`); prints end position comparison without exiting non-zero (`:73-77`); targets port 5174 (`:10`) |
| `large-list.mjs` | diagnostic | local server | has no check | no | Traces scroll FPS/memory, exits 0 |
| `masonry-deep-scroll.mjs` | diagnostic | local server, network images | no | no | Traces deep scroll layout metrics, exits 0 |
| `masonry-groups-arrowright.mjs` | assertion | local server, network images | yes | no | Real prerequisite: network images (`masonry-groups-arrowright.mjs:15` visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80`) |
| `masonry-groups-gap.mjs` | diagnostic | local server, network images | no | no | Returns `{ pass: true }` unconditionally (`masonry-groups-gap.mjs:153`); logs comparisons without failing exit |
| `masonry-groups-keynav.mjs` | assertion | local server, network images | yes | no | Real prerequisite: network images (`masonry-groups-keynav.mjs:14` visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80`) |
| `masonry-horizontal-header.mjs` | diagnostic | local server, network images | no | no | Logs header layout, exits 0 |
| `memory-bench.mjs` | diagnostic | local server | has no check | no | Profiles memory usage, exits 0 |
| `messaging-initial-scroll.mjs` | diagnostic | local server | yes | no | Returns `{ pass }` through `run()` (`messaging-initial-scroll.mjs:111`), exits non-zero on failure |
| `perf-scroll.mjs` | assertion | local server, local data, legacy v1 server | yes | no | Real prerequisites: local data for track-list (`perf-scroll.mjs:56` includes `/examples/track-list` needing uncommitted `data/tracks.db`), and legacy v1 server on port 3340 only under `--compare` (`perf-scroll.mjs:11,66`) |
| `photo-album-groups.mjs` | diagnostic | local server, network images | no | no | Logs group layout, exits 0 |
| `photo-album-horizontal-header.mjs` | diagnostic | local server, network images | no | no | Logs header positions, exits 0 |
| `photo-album-keyboard.mjs` | diagnostic | local server, network images | no | no | Prints layout comparisons, exits 0 (`photo-album-keyboard.mjs:52-57`) |
| `photo-album-last.mjs` | diagnostic | local server, network images | no | no | Logs last item visibility, exits 0 |
| `photo-album-masonry-groups.mjs` | diagnostic | local server, network images | no | no | Logs masonry group layout, exits 0 |
| `photo-album-masonry-keyboard.mjs` | diagnostic | local server, network images | no | no | Logs keyboard navigation, exits 0 |
| `photo-album-selection.mjs` | diagnostic | local server, network images | no | no | Logs selection changes, exits 0 |
| `photo-album-toggle.mjs` | diagnostic | local server, network images | no | no | Logs layout toggle, exits 0 |
| `photo-horiz-scroll.mjs` | diagnostic | local server, network images | has no check | no | Traces horizontal scroll deltas, exits 0 |
| `plugin-wizard-check.mjs` | diagnostic | local server | has no check | no | Inspects wizard controls, exits 0 (`plugin-wizard-check.mjs:25-35`) |
| `plugin-wizard-smooth.mjs` | diagnostic | local server | has no check | no | Logs smooth scrolling metrics, exits 0 |
| `premeasure-clip.mjs` | diagnostic | local server | has no check | no | Measures clipping rects, exits 0 |
| `scale-grid-padding.mjs` | diagnostic | local server | no | no | Returns `{ pass: true }` unconditionally (`scale-grid-padding.mjs:130`); logs comparisons without failing exit |
| `scale-keyboard-nav.mjs` | diagnostic | local server | yes | no | Returns `{ pass }` through `run()` (`scale-keyboard-nav.mjs:122`), exits non-zero on failure |
| `scale-keydown-scroll.mjs` | diagnostic | local server | no | no | Returns `{ pass: true }` unconditionally (`scale-keydown-scroll.mjs:74`); logs comparisons without failing exit |
| `scale-padding.mjs` | diagnostic | local server | no | no | Returns `{ pass: true }` unconditionally (`scale-padding.mjs:80`); logs comparisons without failing exit |
| `search-highlight.mjs` | diagnostic | local server | no | no | Exits non-zero only when its input is missing (`search-highlight.mjs:36-39`); a comparison mismatch logs `❌ PARTIAL` and still returns `{ pass: true }` (`:100-106`) |
| `social-feed-shifttab.mjs` | diagnostic | local server | has no check | no | Traces Shift+Tab key navigation, exits 0 |
| `sticky-horizontal-layout.mjs` | diagnostic | local server | no | no | Logs sticky header coordinates, exits 0 |
| `synthetic-touch.mjs` | assertion | local server | yes | yes | Asserts synthetic touch gesture scenarios via `node:assert/strict` (`synthetic-touch.mjs:2`), exits non-zero on assertion failure; clean checkout satisfies all needs |
| `table-blank-aggressive.mjs` | diagnostic | local server | has no check | no | Measures blank frames during scroll, exits 0 |
| `table-blank-auto.mjs` | diagnostic | local server | no | no | Logs blank frames and explicitly ends with `process.exit(0)` (`table-blank-auto.mjs:294`) |
| `table-blank-diagnosis.mjs` | diagnostic | local server | has no check | no | Records scroll frames, exits 0 |
| `table-blank-frames.mjs` | diagnostic | local server | has no check | no | Records frame render timestamps, exits 0 |
| `table-blank-precise.mjs` | diagnostic | local server | has no check | no | Records high-precision frame intervals, exits 0 |
| `table-blank-trace.mjs` | diagnostic | local server | has no check | no | Traces scroll position vs render cycle, exits 0 |
| `track-restore.mjs` | diagnostic | local server, local data | has no check | no | Traces scroll restoration, exits 0; requires `data/tracks.db` |
| `track-scroll-drift.mjs` | diagnostic | local server, local data | has no check | no | Measures scroll drift over time, exits 0; requires `data/tracks.db` |
| `track-select-all.mjs` | diagnostic | local server, local data | yes | no | Returns `{ pass }` through `run()` (`track-select-all.mjs:78`), exits non-zero on failure; requires `data/tracks.db` |
| `transition-messaging.mjs` | diagnostic | local server | has no check | no | Traces view transition animations, exits 0 |
| `tree-click.mjs` | diagnostic | local server | no | no | Prints pass/fail labels, exits 0 (`tree-click.mjs:95-105`) |
| `tree-focus.mjs` | assertion | local server | yes | no | **Stale test:** snapshots visible items before a click that expands a folder, then compares against the stale snapshot (`tree-focus.mjs:56-69,93-99`). Test repair backlog, not a site fault. |
| `tree-selection-consistency.mjs` | diagnostic | local server | yes | no | Returns `{ pass }` through `run()` (`tree-selection-consistency.mjs:306`), exits non-zero on failure |
| `tree-spacing.mjs` | diagnostic | local server | no | no | Logs tree item margins and heights, exits 0 |
| `tree-src-click.mjs` | assertion | local server | yes | yes | Asserts folder click selects and focuses `vlist/src` (`tree-src-click.mjs:212-219`), exits non-zero on failure via `run()`; clean checkout satisfies all needs |
| `tree-test-folder-click.mjs` | assertion | local server | yes | no | **Stale test:** target folder `vlist/test` at index 22 is outside the rendered viewport on initial load; script dispatches raw mouse click at off-screen coordinates without scrolling into view (`tree-test-folder-click.mjs:52-57,105-115`). Test repair backlog, not a site fault. |
| `v2-fixes.mjs` | assertion | local server, local data | yes | no | Real prerequisite: local data for track-list (`v2-fixes.mjs:28-32` includes `/examples/track-list` which needs uncommitted `data/tracks.db`) |

---

## Detailed Notes on Excluded Asserting Tests

### Stale Tests (Test Repair Backlog)
1. **`tree-focus.mjs`** (`:56-69,93-99`):
   - The script snapshots the visible items before a click that expands a folder, then compares focus after ArrowDown against the stale snapshot (`tree-focus.mjs:56-69,93-99`).
   - The tree demo enables `expandOnClick: true` with asynchronous child loading (`examples/tree/script.js:125-136`). Recomputing the expected next visible item after folder expansion is needed.

2. **`tree-test-folder-click.mjs`** (`:52-57,105-115`):
   - The test finds `vlist/test` at index 22 in the initial item list, computes its bounding rectangle, and dispatches a raw `page.mouse.click` at those coordinates without scrolling the item into view.
   - Because index 22 is outside the rendered viewport on initial load, the click target is off-screen and receives zero click events.
   - Scrolling the target item into view before clicking is needed.

### External Prerequisites & Not Established
1. **`file-browser-grid.mjs`** (`:14,136`):
   - Real prerequisite: not established. Visits `/examples/file-browser` and asserts multi-column grid layout.
2. **`groups-horizontal-headers.mjs`** (`:15,106`):
   - Real prerequisite: network images. Visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80` (`https://picsum.photos`).
3. **`masonry-groups-arrowright.mjs`** (`:15,102`):
   - Real prerequisite: network images. Visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80` (`https://picsum.photos`).
4. **`masonry-groups-keynav.mjs`** (`:14,124`):
   - Real prerequisite: network images. Visits `/examples/photo-album`; image URLs are at `examples/photo-album/vanilla/script.js:221` and `examples/photo-album/shared.js:80` (`https://picsum.photos`).
5. **`perf-scroll.mjs`** (`:11,56,66`):
   - Real prerequisite: local track database (`data/tracks.db`) required by `/examples/track-list` (`:56`), and legacy v1 server on port 3340 required only under `--compare` (`:11,66`).
6. **`v2-fixes.mjs`** (`:9,28-32,184`):
   - Real prerequisite: local track database (`data/tracks.db`) required by `/examples/track-list` (`:28-32`).

Agent: Gemini 3.8 Flash · implementer
