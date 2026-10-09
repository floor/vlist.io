# Browser Debug Scripts Classification

Classification of the 72 scripts in `scripts/debug/tests/` evaluated for the browser gating suite on `next`.

## Summary

- **Total scripts:** 72
- **Assertion scripts:** 11 (assert specific behavior and report pass/fail or exit non-zero)
- **Diagnostic scripts:** 61 (measure, profile, or trace behavior without pass/fail gating or non-zero exits)
- **In test suite:** 3 asserting scripts that depend only on standard artifacts present in a clean checkout and pass on `next`
- **Red on next:** 2 asserting scripts that fail on current `next` and are excluded per brief instructions
- **Excluded assertions (missing dependencies):** 6 scripts (require uncommitted local databases, external network images, sibling checkouts, or legacy servers)
- **Excluded diagnostics:** 61 scripts

## Classification Criteria

- **Kind:**
  - **assertion:** Asserts expected functional or geometric behavior and exits non-zero (or reports a failing pass status) on failure.
  - **diagnostic:** Observes, traces, benchmarks, or logs runtime metrics, leaving exit status 0 regardless of diagnostic findings.
- **Needs:**
  - **local server:** Running `server.ts` instance.
  - **legacy v1 server:** Legacy v1 staging instance running on port 3340 (`../vlist.io-v1`).
  - **network images:** External image services (`fastly.picsum.photos`, Unsplash).
  - **local data:** Local SQLite databases not tracked in git (`data/tracks.db`, `data/cities.db`).
  - **sibling checkouts:** External checkouts alongside the repository (`../vlist`, `../vlist.io`).
  - **vite dev server:** External Vite development server on port 5174.
  - **temporary instrumentation:** Code modifications such as exposing `window.__list`.
- **In Suite:**
  - **yes:** Asserting script that relies strictly on resources available in a clean checkout and passes on `next`.
  - **no:** Diagnostic scripts, scripts failing on `next`, or asserting scripts requiring missing local data, network access, or external server dependencies.

---

## Test Inventory Table

| Script | Kind | Needs | In Suite | Why |
|---|---|---|:---:|---|
| `bench-suite.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `bounded-list.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-basic.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-buttons.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-hero-engine.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-hero.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-keyboard.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-md3.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-multi-aspect.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-rapid-nav.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-snap-fling.mjs` | assertion | local server | yes | Asserts wheel snap across 3 fling scenarios and exits non-zero on failure; clean checkout satisfies all needs |
| `carousel-snap-render-chop.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `carousel-snap-trajectory.mjs` | diagnostic | local server, temporary instrumentation | no | Diagnostic only (measures/logs without asserting non-zero exit); needs temporary code instrumentation |
| `carousel-trackpad-scroll.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `check-horiz-class.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `data-table-groups.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `data-table-keyboard.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `data-table-scroll-last.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `data-table-selection.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `data-table-snapshots.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `file-browser-grid.mjs` | assertion | local server, sibling checkouts (../vlist, ../vlist.io) | no | Needs sibling checkouts (../vlist, ../vlist.io) which clean standalone checkout lacks |
| `file-browser-table.mjs` | diagnostic | local server, sibling checkouts (../vlist, ../vlist.io) | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `grid-coverage.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `grid-pagedown.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `groups-horizontal-headers.mjs` | assertion | local server, network images | no | Needs external network images for photo album example |
| `large-list-scrollbar-bottom.mjs` | diagnostic | vite dev server (:5174) | no | Diagnostic only (measures/logs without asserting non-zero exit); needs vite dev server on 5174 |
| `large-list.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `masonry-deep-scroll.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `masonry-groups-arrowright.mjs` | assertion | local server, network images | no | Needs external network images for photo album example |
| `masonry-groups-gap.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `masonry-groups-keynav.mjs` | assertion | local server, network images | no | Needs external network images for photo album example |
| `masonry-horizontal-header.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `memory-bench.mjs` | diagnostic | legacy v1 server (:3340) | no | Diagnostic only (measures/logs without asserting non-zero exit); needs legacy v1 server |
| `messaging-initial-scroll.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `perf-scroll.mjs` | assertion | legacy v1 server (:3340), local data (data/tracks.db), network images | no | Composite suite needs local data (tracks.db), external network images, and legacy v1 server for comparisons |
| `photo-album-groups.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-horizontal-header.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-keyboard.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-last.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-masonry-groups.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-masonry-keyboard.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-selection.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-album-toggle.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `photo-horiz-scroll.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `plugin-wizard-check.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `plugin-wizard-smooth.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `premeasure-clip.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `scale-grid-padding.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `scale-keyboard-nav.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `scale-keydown-scroll.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `scale-padding.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `search-highlight.mjs` | diagnostic | local server, sibling checkouts (../vlist, ../vlist.io) | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `social-feed-shifttab.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `sticky-horizontal-layout.mjs` | diagnostic | local server, network images | no | Diagnostic only (measures/logs without asserting non-zero exit); needs network images |
| `synthetic-touch.mjs` | assertion | local server | yes | Asserts touch, pointer, cancellation, and geometry with node:assert/strict; clean checkout satisfies all needs |
| `table-blank-aggressive.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `table-blank-auto.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `table-blank-diagnosis.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `table-blank-frames.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `table-blank-precise.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `table-blank-trace.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `track-restore.mjs` | diagnostic | local server, local data (data/tracks.db) | no | Diagnostic only (measures/logs without asserting non-zero exit); needs uncommitted tracks.db |
| `track-scroll-drift.mjs` | diagnostic | local server, local data (data/tracks.db) | no | Diagnostic only (measures/logs without asserting non-zero exit); needs uncommitted tracks.db |
| `track-select-all.mjs` | diagnostic | local server, local data (data/tracks.db) | no | Diagnostic only (measures/logs without asserting non-zero exit); needs uncommitted tracks.db |
| `transition-messaging.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `tree-click.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `tree-focus.mjs` | assertion | local server | no | Red on next: ArrowDown keyboard navigation moves to wrong child item rather than expected sibling (expected vlist/src/plugins, got vlist/src/events/emitter.ts) |
| `tree-selection-consistency.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `tree-spacing.mjs` | diagnostic | local server | no | Diagnostic only (measures/logs without asserting non-zero exit) |
| `tree-src-click.mjs` | assertion | local server | yes | Asserts selection and focus state when clicking src folder; clean checkout satisfies all needs |
| `tree-test-folder-click.mjs` | assertion | local server | no | Red on next: clicking unrendered/scrolled off-screen folder target (vlist/test at index 22) fails to select or focus |
| `v2-fixes.mjs` | assertion | local server, local data (data/tracks.db), network images | no | Composite suite includes test cases requiring local data (track-list needs data/tracks.db) and external network images (photo-album) |

---

## Red on Next (Excluded Assertions)

The following two asserting scripts fail on current `next` and are left out of the gating suite per brief instructions:

1. **`tree-focus.mjs`**:
   - **Failure:** After clicking an item (`vlist/src/events`) and pressing ArrowDown, focus moves to an internal child item (`vlist/src/events/emitter.ts`) instead of the expected sibling folder (`vlist/src/plugins`).
   - **Output:**
     ```text
     --- Result ---
       Expected focus: vlist/src/plugins
       Actual focus:   vlist/src/events/emitter.ts
       ❌ FAIL
     ```

2. **`tree-test-folder-click.mjs`**:
   - **Failure:** Target folder `vlist/test` is at index 22, outside the initially rendered viewport window. The click fails to reach the unrendered item, registering 0 events and failing selection/focus assertions.
   - **Output:**
     ```text
     Target: vlist/test at index 22
     --- Clicking vlist/test ---
     --- Trace (0 events) ---
     vlist/test selected: ❌
     vlist/test focused:  ❌
     ```
