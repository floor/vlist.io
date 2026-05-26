---
created: 2026-05-25
updated: 2026-05-25
status: open
---

# Initial render 3x slower than leading virtual list libraries

> At 10K items with fixed 48px height, VList (Vanilla JS) renders in **3.0ms** (median) — 3x slower than TanStack Virtual (1.0ms), Legend List (1.0ms), and react-window (1.1ms). Memory is best-in-class (0.01 MB), so the architecture is lean — the render commit path needs tightening.

**Status:** Open
**Affects:** `src/core/pipeline.ts`, `src/core/create.ts`, `src/core/state.ts`, `src/core/dom.ts`
**Benchmark:** virtuallist.io crowdsourced render suite, 10K items, fixed height 48px, 18 runs

---

## Benchmark context

| Library | Render | Memory | Scroll FPS |
|---------|--------|--------|------------|
| TanStack Virtual (React) | 1.0 ms | 0.61 MB | 229.7 fps |
| react-window (React) | 1.1 ms | 0.22 MB | 441.1 fps |
| react-virtualized (React) | 1.4 ms | 0.22 MB | 507.8 fps |
| Virtua (React) | 2.8 ms | 0.35 MB | 428.4 fps |
| **VList (Vanilla JS)** | **3.0 ms** | **0.01 MB** | **400.2 fps** |

VList has the smallest memory footprint by far, but its render time is the worst among serious contenders. The benchmark measures pure JS execution time of `createVList()` — config resolution, DOM construction, state allocation, and the first `phase1Calculate` + `phase2Commit` cycle.

## Root causes

### 1. N individual `appendChild` calls into live DOM — `pipeline.ts:286`

`phase2Commit` inserts each newly created element one by one into `contentElement`, which is already in the live document (attached by `createDOMStructure`). For a 600px viewport with 48px items and overscan=3, this means **16 individual `appendChild` calls** to a live DOM node. Each insertion can trigger incremental layout invalidation.

React-based competitors (TanStack, react-window) build their tree in a detached VDOM and flush once. VList should use a `DocumentFragment` to batch all new nodes and do a single `appendChild`.

**Expected impact:** High — likely where most of the 2ms gap lives.

### 2. Redundant `clientWidth`/`clientHeight` read — `create.ts:311` vs `create.ts:463-465`

Container size is read at line 311 (after DOM structure is created, populates `state.containerSize`) and again at lines 463-465 (after scroll handler attachment). The second read is redundant — the value hasn't changed. Each read of `clientWidth`/`clientHeight` forces a synchronous layout flush if any layout-affecting changes are pending.

**Expected impact:** High — eliminates one forced layout flush.

### 3. Oversized initial TypedArray allocation — `create.ts:149`

`initialCapacity` uses a hardcoded `4096` divisor: `Math.ceil(4096 / minItemSize) + overscan * 2 + 8`. For 48px items this allocates capacity for 100 items (3 TypedArrays, ~3.2 KB zero-fill). The actual container is typically ~600px, needing only ~20 slots. The real container size isn't known until line 311, but the arrays are allocated at line 149 — before the DOM is even created.

**Expected impact:** Medium — 5x reduction in TypedArray zero-fill cost.

### 4. Plugin infrastructure runs unconditionally — `create.ts:72-94`

`sortPlugins` does `[...plugins]` (array spread), `checkConflicts` allocates a `new Set<string>()`, and `compileHooks` creates 5 arrays — all of this runs even when `plugins` is empty (the common case, and the benchmark case).

**Expected impact:** Medium — avoids unnecessary allocations on the cold path.

### 5. Per-item string allocations in phase2Commit — `pipeline.ts:242-280`

For each new item (16 on first render):
- `String(dataIndex)` — line 242
- `String(dataIndex + 1)` — line 245
- `rc.prefix + "-item-" + dataIndex` — line 244
- `String(item.id)` — line 249
- `rc.translateProp + transformOffset + "px)"` — line 273
- `sizeVal + "px"` — line 280

That's 5-6 string allocations per item, ~80-96 total for a standard 16-item initial render. Individually small but collectively adds GC pressure.

**Expected impact:** Low-medium — micro-optimization, but measurable at scale.

### 6. `syncContentSize()` before render is a separate DOM mutation — `create.ts:470`

`syncContentSize()` writes `dom.content.style.height` before `doRender()` runs. This is a separate layout-invalidating style write before the 16 `appendChild` calls, meaning the browser processes two distinct DOM mutation phases.

**Expected impact:** Low — merging into the render commit would reduce mutation passes.

## Proposed fix order

1. **DocumentFragment batching** (root cause #1) — highest ROI
2. **Eliminate redundant layout read** (root cause #2) — quick win
3. **Right-size TypedArrays** (root cause #3) — requires reordering init sequence
4. **Skip empty plugin infra** (root cause #4) — trivial guard
5. **String allocation reduction** (root cause #5) — micro-optimization
6. **Merge syncContentSize** (root cause #6) — minor

## Target

Bring render time from 3.0ms to under 1.5ms, ideally matching the ~1.0ms tier. Memory footprint (0.01 MB) must not regress.

---

*Created: 2026-05-25*
