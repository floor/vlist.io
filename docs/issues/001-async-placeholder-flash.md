---
id: "001"
title: Async plugin shows placeholders at slow scroll speeds
severity: medium
status: fixed
component: plugins/async
related: []
---

# Issue 001: Async plugin shows placeholders at slow scroll speeds

---

## Symptom

When scrolling slowly (well under the 15 px/ms `LOAD_VELOCITY_THRESHOLD`), placeholders flash briefly on screen before being replaced by real data. This happens even in simulated mode with zero API delay.

## Root Cause

The velocity check in `onAfterScroll` (`src/plugins/async/plugin.ts:318-367`) defers data loading for **any** velocity above `PRELOAD_VELOCITY_THRESHOLD` (2 px/ms), but the render pipeline calls `getItem()` synchronously — which always generates placeholders for unloaded indices.

### The timing mismatch

1. **Frame N — scroll fires:**
   - `onAfterScroll()` checks velocity
   - Velocity is e.g. 5 px/ms — below 15 (cancel threshold) but above 2 (preload threshold)
   - Hits the moderate-speed branch (line 335): sets `pendingRange` and schedules a **100ms timer** (line 350-358)
   - **Returns without calling `ensure()`**

2. **Same frame — Phase 2 Commit:**
   - Pipeline calls `getItem(index)` for each visible index (`src/core/pipeline.ts:161`)
   - `manager.ts:326-340`: no cached data found → `getOrCreatePlaceholders().generate(index)` returns a placeholder
   - Template renders with placeholder (masked fields)

3. **100ms later:**
   - Timer fires, `ensure()` fetches data
   - Re-render replaces placeholders with real items

**Result:** User sees skeleton placeholders for ~100ms despite scrolling at only 5 px/ms.

### Why zero-delay simulated mode still flashes

Even with `apiDelay = 0`, `ensure()` is async (`manager.ts:490-606`) — it `await`s the fetch promise. The render happens before the microtask completes, so placeholders are visible for at least 1 frame.

## Key Code Locations

| File | Lines | Role |
|------|-------|------|
| `src/plugins/async/plugin.ts` | 324-330 | Fast velocity branch (>15 px/ms): skips loading |
| `src/plugins/async/plugin.ts` | 335-359 | Moderate velocity branch (2-15 px/ms): 100ms deferred load |
| `src/plugins/async/plugin.ts` | 362-366 | Slow velocity branch (<2 px/ms): loads immediately |
| `src/plugins/async/manager.ts` | 326-340 | `getItem()` — always generates placeholder for unloaded index |
| `src/constants.ts` | 37 | `PRELOAD_VELOCITY_THRESHOLD = 2` |
| `src/constants.ts` | 43 | `LOAD_VELOCITY_THRESHOLD = 15` |

## v1 Behavior

In v1, slow scrolling does not produce placeholder flashes. Data is fetched eagerly and the render waits or uses cached data.

## Fix

**Commit:** `fix(async): load visible range immediately at moderate scroll speeds`

The moderate-velocity branch (2-15 px/ms) was deferring **all** loading by 100ms, including the visible range. The fix adds an immediate `ensure()` call for the visible range before setting up the debounced preload-ahead timer.

```diff
 if (currentVelocity > preloadThreshold) {
+  if (visEnd >= engineState.startIndex) {
+    ensure(engineState.startIndex, visEnd).catch(onEnsureError);
+  }
+
   let loadStart = engineState.startIndex;
```

This is safe because `ensureRange()` already returns immediately if the range is loaded, and deduplicates concurrent fetches for the same chunk.

**Status:** Fixed
