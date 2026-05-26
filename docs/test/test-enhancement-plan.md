# Test Enhancement Plan

**Context:** v2 has ~900 fewer tests than v1 (2589 vs 3486). Some are legitimately gone (builder pattern removed), but integration tests, end-to-end tests, and several plugin coverage gaps need to be filled.

**Target:** match or exceed v1 test count with meaningful coverage, not padding.

---

## Workflow — `bun test --changed`

Bun 1.3+ has built-in `--changed` support. Use it during development to run only tests affected by modified source files:

```bash
bun test --changed              # tests for uncommitted changes
bun test --changed=HEAD~3       # tests for last 3 commits
bun test --changed=staging      # tests for changes since staging branch
```

This maps changed source files to their corresponding test files via git. To make this work well, **integration tests must be split by plugin combination** (not one monolithic file) so `--changed` can select the right subset. For example: changing `src/plugins/page/plugin.ts` should trigger `test/plugins/page/` + `test/integration/async-page.test.ts` — not all 255 integration tests.

### File naming convention for integration tests

```
test/integration/{pluginA}-{pluginB}.test.ts
```

Import from both plugin source files so Bun's dependency tracking links them:

```ts
import "../../src/plugins/async/plugin";
import "../../src/plugins/page/plugin";
```

### Parallel execution — `--concurrent`

Bun 1.3+ supports `--concurrent` (treats all tests as `test.concurrent()`) and `--max-concurrency=<N>` (default: 20).

~~Current results with `--concurrent`: **8.3s** (vs 16.5s sequential), but 12 tests fail from shared state races.~~

**Status: COMPLETE.** All 2589 tests pass in concurrent mode. Time: **6.8s** (vs 11.6s sequential — 1.7x speedup).

Fixes applied:
- `scrollbar.test.ts` (7 failures) — replaced real timers with deterministic `useFakeTimers()` utility + `fakeTimers.tick(N)`. rAF set to 16ms intervals through fake timer.
- `sortable/feature.test.ts` (2 failures) — same fake timer approach, all `await setTimeout` replaced with synchronous `fakeTimers.tick(N)`.
- `transition/feature.test.ts` (1 failure) — mock animation resolution changed from `setTimeout` to `Promise.resolve().then(...)`. Assertion moved before `await` to avoid concurrent array clearing.
- `snapshots/feature.test.ts` (1 failure) — collapsed 4 nested rAF `beforeAll`/`afterAll` into single outer synchronous rAF. Fixed test ordering and unique sessionStorage keys.
- `scroll.test.ts` (1 failure) — fixed in prior session (position-equality dedup required setting scrollTop before dispatching).

### DOM Environment — happy-dom Migration

**Status: COMPLETE.** Migrated from JSDOM to happy-dom across 22 test files. 2 files kept on JSDOM (controller.test.ts, scale/feature.test.ts) for per-test DOM isolation.

**Why happy-dom:**
- ~3x faster than JSDOM (6.7s concurrent vs heavier JSDOM overhead)
- Implements `window.scrollTo`, `ResizeObserver` stubs, and proper scroll/resize APIs
- Less boilerplate — `GlobalRegistrator.register()` sets all globals in one call

**Architecture:**
- `test/helpers/dom.ts` rewritten: uses `@happy-dom/global-registrator` with `setupDOM()`/`teardownDOM()` helpers
- `useFakeTimers()` utility (Bun 1.3 lacks `mock.timers`): intercepts setTimeout/setInterval, provides synchronous `tick(ms)` and `restore()`
- rAF default: `setTimeout(cb, 0)` for core tests, `setTimeout(cb, 16)` for scrollbar/sortable (avoids infinite recursion in recursive animation loops)

**Key gotchas resolved:**
- happy-dom `new Window()` has a querySelector bug (`this.window.SyntaxError` undefined) — use `GlobalRegistrator` instead
- DOMRect uses prototype getters — `{...rect}` produces `{}`, must create full mock objects
- happy-dom implements `window.scrollTo` — tests that relied on no-op scrollTo need explicit override
- JSDOM rejects cross-realm events — files using per-test JSDOM must override `globalThis.Event`/`WheelEvent`/etc. with `dom.window.*` versions
- `GlobalRegistrator.register()`/`unregister()` is per-process but safe — each Bun test file runs in its own worker

### Package.json scripts

```json
"test:changed": "bun test --changed",
"test:changed:staging": "bun test --changed=staging",
"test:fast": "bun test --concurrent"
```

---

## Priority 1 — Integration Tests (v1 had 255, v2 has 0)

The `test/integration/` directory is empty. These cross-plugin tests are the highest-value tests — today's page+async bug (issue 1) would have been caught here.

### Cross-plugin tests (one file per combination)

Split by plugin pair so `bun test --changed` selects only relevant combinations:

| File | Coverage |
|------|----------|
| `test/integration/async-page.test.ts` | data loads in window-scroll mode, idle hooks fire, placeholders replaced |
| `test/integration/async-selection.test.ts` | select placeholder, select after load, selection survives reload |
| `test/integration/async-snapshots.test.ts` | save/restore with partially-loaded data |
| `test/integration/async-scale.test.ts` | compressed scroll triggers loads, decompression preserves data |
| `test/integration/async-groups.test.ts` | group headers with async data, sticky headers during loading |
| `test/integration/scale-selection.test.ts` | selection in compressed mode, keyboard nav across boundaries |
| `test/integration/scale-scrollbar.test.ts` | thumb position matches compressed scroll, drag works |
| `test/integration/scale-scrollbar-snapshots.test.ts` | save/restore with compression + custom scrollbar |
| `test/integration/grid-selection.test.ts` | 2D keyboard navigation, multi-select across rows |
| `test/integration/groups-grid.test.ts` | grid layout inside group sections |
| `test/integration/selection-scrollbar.test.ts` | scroll-to-selected on keyboard nav with custom scrollbar |

### `test/integration/lifecycle.test.ts`

Full lifecycle through createVList:

- create → initial render → items visible in DOM
- create → scroll → items update → scroll to end → correct final state
- create → add/remove items → DOM reflects changes
- create → destroy → all listeners removed, DOM cleaned up
- create → destroy → create again (double lifecycle)
- horizontal mode equivalent of the above

### `test/integration/memory.test.ts`

Resource cleanup and leak prevention:

- DOM cleanup after destroy (no orphan elements)
- ResizeObserver cleanup after destroy
- event listener cleanup (scroll, wheel, resize, keyboard)
- timer cleanup (idle timers, animation frames)
- element pool drain after destroy
- create/destroy cycles don't leak (10 rapid cycles)
- large dataset cleanup (100K items → destroy → GC-ready)

### `test/integration/performance.test.ts`

Performance regression guards (not benchmarks — just bounds):

- initialization time < threshold for 100K items
- render cycle completes within frame budget
- scrollToIndex positioning is correct (not just fast)
- selection toggle doesn't trigger full re-render
- destroy completes promptly

---

## Priority 2 — createVList End-to-End (`builder/index.test.ts` replacement)

v1 had 254 tests in `builder/index.test.ts` covering the full public API via the builder pattern. v2 needs equivalent coverage via `createVList()`.

### `test/core/create.test.ts`

- **Validation:** missing container, invalid config, unknown plugin names
- **Plugin wiring:** each plugin registers correctly, priority ordering, conflict detection
- **Public API surface:** all methods exist and return expected types
- **Scroll config:** wheel enable/disable, idle timeout, custom scrollTarget
- **Horizontal mode:** axes swap correctly, scroll/size reads use correct properties
- **Event handling:** scroll, item:click, resize, scroll:idle fire correctly
- **Data operations:** appendItems, removeItems, replaceAll, clear
- **scrollToIndex:** start/center/end alignment, smooth behavior, out-of-bounds clamping
- **Destroy:** returns cleanly, methods throw or no-op after destroy

---

## Priority 3 — Plugin Coverage Gaps

Tests that existed in v1 but were trimmed or deleted in v2.

### `test/plugins/async/feature.test.ts` (v1: 74, v2: 30, delta: -44)

Missing coverage:
- Loading state transitions (idle → loading → loaded → error → retry)
- Error recovery (adapter throws, adapter returns partial data)
- Race conditions (rapid scroll triggers overlapping loads)
- Memory management (loaded chunks evicted under pressure)
- Edge cases (empty result, total changes mid-scroll, adapter timeout)

### `test/plugins/selection/feature.test.ts` (v1: 104, v2: 88, delta: -16)

Missing coverage:
- Edge cases (select beyond range, select during async load, deselect all)
- Keyboard navigation integration (arrow keys update selection + scroll)
- Multi-select with shift+click range behavior

### `test/core/scroll.test.ts` (v1: 34, v2: 25, delta: -9)

Missing coverage:
- Position-equality dedup (scroll event with same position is skipped)
- Smooth scroll animation (target reached, cancelScroll mid-animation)
- Smooth scroll with setFn (scrollSetFn called per tick)
- Wheel event with cross-axis overflow (deltaX passthrough)

### `test/plugins/page/feature.test.ts` (v1: 50, v2: 39, delta: -11)

Missing coverage:
- scrollToPosFn integration (scrollPadding offsets for start/center/end)
- onScrollFrame/onScrollIdle hooks fire correctly
- Smooth scrollToIndex in page mode

### `test/core/range.test.ts` (v1: 36, v2: 21, delta: -15)

Missing coverage:
- Edge cases (single item, item larger than viewport, zero-size items)
- Overscan at boundaries (start of list, end of list)
- Range stability during small scroll deltas

---

## Priority 4 — New v2 Features (not in v1)

Tests for v2-specific functionality that v1 didn't have:

### `test/core/pipeline.test.ts`

- phase1Calculate range-unchanged fast path (returns false)
- phase1Calculate with startPadding offset
- phase2Commit placeholder class handling (PLACEHOLDER_ID_PREFIX)
- phase2Commit replaced class with 300ms timeout
- phase2Commit _lastOffset/_lastSize caching (skip unchanged DOM writes)
- phase2Commit oddClass toggling

### `test/core/hooks.test.ts`

- runAfterScrollHooks called with correct position/direction
- runIdleHooks called once per idle cycle
- runCalculateHooks/runCommitHooks integration with pipeline
- Hook compilation from plugin definitions

---

## Implementation Order

1. ~~Fix 12 concurrent-mode failures~~ ✅ Done — all 2589 tests pass with `--concurrent`
2. ~~Migrate JSDOM → happy-dom~~ ✅ Done — 22 test files migrated, 2 kept on JSDOM (controller.test.ts, scale/feature.test.ts use per-test JSDOM isolation)
3. Integration tests (split by plugin pair) — highest risk, catches real bugs
4. `test/core/create.test.ts` — end-to-end API coverage
5. `test/integration/lifecycle.test.ts` + `memory.test.ts` — destroy/cleanup
6. `test/core/scroll.test.ts` additions — recently changed code
7. `test/plugins/async/feature.test.ts` additions — largest plugin gap
8. Remaining priority 3 & 4 items

**Expected test count after completion:** ~3400-3500 (matching v1 with v2-specific additions).
