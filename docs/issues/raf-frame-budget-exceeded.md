---
created: 2026-05-09
updated: 2026-05-10
status: resolved
---

# requestAnimationFrame handler exceeds 16ms frame budget during compressed scroll

> During wheel scrolling on large lists with `withScale`, the `smoothScrollTick` rAF callback consistently takes 52-91ms, far exceeding the 16ms budget for 60fps. This blocks the main thread, delaying subsequent wheel events by 100ms+.

**Status:** Resolved (2026-05-10)
**Affects:** `src/features/async/manager.ts`, `src/features/async/feature.ts`
**Reproduction:** Any list with `withScale` + `withAsync` + `withGroups` (e.g. 892K items)

---

## Symptoms

```
index.js:2885 [Violation] 'requestAnimationFrame' handler took 56ms
index.js:2885 [Violation] 'requestAnimationFrame' handler took 64ms
index.js:2885 [Violation] 'requestAnimationFrame' handler took 87ms
index.js:2885 [Violation] 'requestAnimationFrame' handler took 80ms
index.js:2885 [Violation] 'requestAnimationFrame' handler took 91ms
index.js:2052 [Violation] Handling of 'wheel' input event was delayed for 117ms
index.js:4253 [Violation] 'setTimeout' handler took 58ms
```

Three distinct violations:

| Violation | Source (dist) | Source (src) | Impact |
|-----------|--------------|--------------|--------|
| rAF 52-91ms | `index.js:2885` | `scale/feature.ts` `smoothScrollTick` | Janky scrolling, dropped frames |
| Wheel delay 117ms | `index.js:2052` | `core.ts` wheel handler | Input lag, unresponsive feel |
| setTimeout 58ms | `index.js:4253` | `async/feature.ts` `loadPendingRange` idle callback | Blocks main thread between scroll bursts |

## Root causes

### 1. `loadRange()` scanned all cached chunks on every scroll frame — O(all-cached-items)

The async feature's `afterScroll` hook calls `ensureRange()` → `loadRange()` on
every scroll frame. `loadRange()` called `storage.getLoadedRanges()` which:

1. `Array.from(chunks.keys())` — copies all chunk keys
2. `.sort((a, b) => a - b)` — sorts them
3. Iterates every chunk, expanding each to its item range

Then `calculateMissingRanges()` walked the sorted ranges to find gaps. For an
892K-item list with ~35K loaded chunks, this scanned tens of thousands of entries
every frame — **consistently 28-35ms per frame**.

**Fix:** Replaced with a direct chunk scan. `loadRange()` now computes the
first and last chunk index for the requested range and checks each with
`storage.isChunkLoaded(chunkIdx)` — O(range/chunkSize), typically 1-3 lookups.

```typescript
// Before — O(all-cached-items):
const loadedRanges = storage.getLoadedRanges();
const missingRanges = calculateMissingRanges({ start, end }, loadedRanges, storage.chunkSize);

// After — O(range/chunkSize):
const firstChunk = Math.floor(start / chunkSize);
const lastChunk = Math.floor(end / chunkSize);
for (let chunkIdx = firstChunk; chunkIdx <= lastChunk; chunkIdx++) {
  if (!storage.isChunkLoaded(chunkIdx) && !activeLoads.has(key)) {
    chunksToLoad.push({ start: chunkStart, end: chunkEnd });
  }
}
```

**File:** `src/features/async/manager.ts` — `loadRange()`

### 2. `sizeCache.rebuild()` triggered on every state change — O(n)

The async feature's `onStateChange` handler called `sizeCache.rebuild(newTotal)`
on every `isLoading` toggle. With variable-size items (groups active), `rebuild()`
allocates a `Float64Array(n+1)` and calls `sizeFn(i)` for all n items.

For 892K items, each rebuild took **78-120ms**. Since `notifyStateChange` is
called synchronously inside `loadRange()` before the first `await`, this ran
on the hot path within the afterScroll hook.

**Fix:** Guard with a total-changed check. `rebuild()` is only called when
the total actually changes.

```typescript
// Before — rebuilds prefix sums on every isLoading toggle:
ctx.sizeCache.rebuild(newTotal);

// After — only rebuilds when total changes:
if (newTotal !== ctx.sizeCache.getTotal()) {
  ctx.sizeCache.rebuild(newTotal);
}
```

**File:** `src/features/async/feature.ts` — `onStateChange` handler

## Cascade effects

The two root causes explained all three violation types:

- **rAF 52-91ms:** Root cause #1 (28-35ms) + occasional root cause #2 (78-120ms)
  running inside the afterScroll hook chain, within the rAF callback
- **Wheel delay 117ms:** The wheel handler is `{ passive: false }` (required for
  `preventDefault()`). Chrome blocks the wheel event until the rAF handler
  finishes — the 117ms delay is the long rAF + event queue wait
- **setTimeout 58ms:** `loadPendingRange` idle callback loading data and
  triggering `onStateChange` → `sizeCache.rebuild()` (root cause #2)

## Investigation approach

1. Added per-hook timing to the `afterScroll` hook chain in `core.ts`. Each
   feature's afterScroll hook is indexed by priority: groups(10)→h0,
   async(20)→h1+h2, scrollbar(60)→h3, scale(70)→h4.

2. Identified `h1` (async ensureRange hook) as the consistent bottleneck:
   `h1=65.1/28.5/29.4/28.9/30.1/28.6/35.6/31.1/32.6/32.5/32.9`

3. Traced `h1` → `ensureRange()` → `loadRange()` → `getLoadedRanges()` as
   root cause #1. Fixed, then re-profiled.

4. Most frames dropped to 3-5ms, but rare spikes remained: `h1=78.1`, `h1=118.7`.
   Traced to `notifyStateChange` → `onStateChange` → `sizeCache.rebuild()` as
   root cause #2.

## Hypotheses evaluated

| # | Hypothesis | Result |
|---|-----------|--------|
| H1 | Heavy template application in range-change frames | **Not the cause.** Profiling showed afterScroll hooks, not rendering, consumed the time |
| H2 | Forced synchronous layout (layout thrashing) | **Not the cause.** No layout reads after writes found in the hot path |
| H3 | Async `loadPendingRange` cascading into scroll frames | **Partially confirmed.** The idle callback itself was fine, but the same `loadRange()` bottleneck affected it. Root cause #2 (`sizeCache.rebuild`) also hit here |
| H4 | Multiple vlists on the same page | **Not the cause.** Single vlist instance confirmed |
| H5 | Scrollbar DOM operations in afterScroll | **Not the cause.** Scrollbar hooks measured <0.1ms |

## Prior optimizations (did not fix the issue)

These optimizations from `scale-scroll-pipeline.md` reduced per-frame overhead
but did not address the async hot-path bottlenecks:

1. **`triggerScrollFrame()` API** — eliminated double-render per scroll frame
2. **`smoothScrollTick` self-cancellation fix** — stable multi-frame lerp
3. **Cached compression state** — eliminated 3+ object allocations per frame
4. **Removed PERF instrumentation** — no more `console.log` every 30th frame

## Result

After both fixes, scroll frames consistently complete in 3-5ms with no rAF
violations, wheel delay violations, or setTimeout violations during compressed
scroll on 892K items with `withScale` + `withAsync` + `withGroups`.

---

*Created: 2026-05-09*
*Resolved: 2026-05-10*
*Commit: `218b039`*
*Related: [`scale-scroll-pipeline.md`](../optimization/scale-scroll-pipeline.md)*
