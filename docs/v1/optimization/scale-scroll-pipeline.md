---
created: 2026-05-09
updated: 2026-05-10
status: implemented
branch: perf/scale-scroll-optimization
---

# Scale scroll pipeline optimizations

Eliminates redundant work in the compressed scroll hot path — the rAF
animation loop that drives smooth scrolling for large lists (500K+ items)
using `withScale`.

**Commit:** `perf(scale): eliminate double renders and per-frame allocations in scroll pipeline`

---

## Problems addressed

### 1. Double render per scroll frame

When `smoothScrollTick` called `ctx.scrollController.scrollTo(pos)`, the
scroll setter wrapper in `materialize.ts` called `onScrollFrame()` (the
full render pipeline), and then `scrollTo` itself called `$.rfn()` again
— two renders for a single position update.

The same issue existed in `touchMoveHandler` and `momentumTick`.

### 2. smoothScrollTick self-cancellation

The `scrollTo` path went through `$.sst` (the setter), which in some
configurations cancelled the current rAF and scheduled a new one. This
broke the lerp animation: the tick that was already running would be
cancelled mid-frame, and the new rAF would restart with stale state.

### 3. Per-frame object allocation in compressed mode

Three hot-path functions — `setVisibleRangeFn`, `setScrollToPosFn`, and
`setPositionElementFn` — each called `getCompressionState(totalItems,
sizeCache)` on every invocation. This created a new `CompressionState`
object per call. On a single scroll frame with a range change, this
could allocate 3+ objects that immediately became garbage.

---

## Changes

### New API: `triggerScrollFrame()`

Added `triggerScrollFrame()` to the `BuilderContext` interface. This
lets features trigger the full scroll pipeline (render + events +
afterScroll hooks + velocity tracking + idle scheduling) without going
through `scrollController.scrollTo()`.

```
// Before — double render + self-cancellation risk
ctx.scrollController.scrollTo(virtualScrollPosition);

// After — single render, no side effects
ctx.triggerScrollFrame();
```

**Files:**
- `src/builder/types.ts` — interface declaration
- `src/builder/materialize.ts` — implementation (calls `onScrollFrame()`)
- `src/builder/context.ts` — stub for simplified (non-materialize) context

### Scale feature: use triggerScrollFrame

Replaced all `ctx.scrollController.scrollTo()` calls in animation loops
with `ctx.triggerScrollFrame()`:

| Function | Before | After |
|----------|--------|-------|
| `smoothScrollTick` | `scrollTo(virtualScrollPosition)` | `triggerScrollFrame()` |
| `touchMoveHandler` | `scrollTo(newPos)` | `triggerScrollFrame()` |
| `momentumTick` (edge stop) | `scrollTo(newPos)` | `triggerScrollFrame()` |
| `momentumTick` (continue) | `scrollTo(newPos)` | `triggerScrollFrame()` |

The animation loops still update `virtualScrollPosition` before calling
`triggerScrollFrame()` — the render pipeline reads it via `$.sgt()`.

**File:** `src/features/scale/feature.ts`

### Cached compression state on hot path

Replaced `getCompressionState(totalItems, sizeCache)` calls with
`ctx.getCachedCompression()` in the three hot-path functions. The cached
version returns the same object until `totalItems` changes.

| Function | Allocations before | Allocations after |
|----------|-------------------|-------------------|
| `setVisibleRangeFn` | 1 object/call | 0 (cached) |
| `setScrollToPosFn` | 1 object/call | 0 (cached) |
| `setPositionElementFn` | 1 object/call | 0 (cached) |

**File:** `src/features/scale/feature.ts`

### ScrollProxy: onScrollFrame dependency

Changed `createDefaultScrollProxy` to accept `onScrollFrame` in its
deps and call it from `scrollTo`/`scrollBy`, replacing the previous
pattern of `$.ls = pos; $.rfn()` which skipped event emission, velocity
tracking, and afterScroll hooks.

**File:** `src/builder/materialize.ts`

### Removed PERF instrumentation

Removed `performance.now()` calls and `console.log` every 30th frame
from `onScrollFrame` in `core.ts`. These were added during investigation
and should never ship.

**File:** `src/builder/core.ts`

---

## Impact

These optimizations target the per-frame overhead of the scroll
pipeline, not the rendering cost itself. They eliminate:

- **1 redundant `$.rfn()` call per frame** (the double render)
- **3+ object allocations per frame** (compression state)
- **rAF cancellation/restart** (smoothScrollTick self-cancellation)

These changes were necessary but not sufficient to resolve the rAF
violations — the remaining bottlenecks were in the async feature's
afterScroll hooks (see below).

---

## Async hot-path optimizations (2026-05-10)

The rAF violations persisted after the pipeline changes above. Per-hook
profiling of the `afterScroll` chain identified two bottlenecks in the
async feature, both running inside the rAF callback on every scroll frame.

### 1. `loadRange()` O(n) chunk scan → O(range/chunkSize)

`loadRange()` called `storage.getLoadedRanges()` on every scroll frame.
This method copied all chunk keys, sorted them, and iterated every chunk
to build a list of loaded ranges. Then `calculateMissingRanges()` walked
the sorted list to find gaps. For 892K items with ~35K loaded chunks,
this consistently took **28-35ms per frame**.

Replaced with a direct scan: compute the first and last chunk index for
the requested range, check each with `isChunkLoaded()` (a single
`Map.has()` call). Typically 1-3 lookups per frame.

**File:** `src/features/async/manager.ts` — `loadRange()`

### 2. `sizeCache.rebuild()` guard on total change

The async feature's `onStateChange` handler called
`sizeCache.rebuild(newTotal)` on every `isLoading` toggle. With
variable-size items, `rebuild()` allocates `Float64Array(n+1)` and
computes prefix sums for all items — O(n). For 892K items this took
**78-120ms**, causing rare but severe spikes.

`notifyStateChange` runs synchronously inside `loadRange()` before the
first `await`, so this O(n) work executed on the hot path.

Added a guard: `rebuild()` is only called when the total actually changes.

**File:** `src/features/async/feature.ts` — `onStateChange` handler

### Result

Scroll frames consistently complete in **3-5ms** with no rAF violations
on 892K items with `withScale` + `withAsync` + `withGroups`.

**Commit:** `218b039`

---

## Test impact

All 3363 existing tests pass. Changes to test files:

- `test/builder/materialize.test.ts` — updated scroll proxy tests to
  provide `onScrollFrame` mock
- 10 feature test files — added `triggerScrollFrame: () => {}` stub to
  mock `BuilderContext` objects

---

*Related: [`issues/raf-frame-budget-exceeded.md`](../issues/raf-frame-budget-exceeded.md)*
