# Snapshot Restoration with Async + autoLoad:false Issue

**Date:** January 2025  
**Status:** 🟢 Fixed  
**Severity:** High - Breaks scroll position restoration when using `autoLoad: false`  
**Affects:** `withSnapshots` + `withAsync` with `autoLoad: false`

---

## Summary

When using `withSnapshots` with `withAsync({ autoLoad: false })`, the scroll position cannot be restored on page reload. The issue occurs because:

1. With `autoLoad: false`, no data is loaded initially, so `total = 0`
2. When `restoreScroll()` is called, it calculates scroll position but `virtualSize = 0`
3. The calculated position gets clamped to `0` (because `maxScroll = virtualSize - containerSize = 0 - 598 = 0`)
4. `reload()` is called at position `0`, loading offset `0` instead of the restored position

---

## Current Behavior

### Example Setup
```javascript
// velocity-loading example
const list = vlist({ ... })
  .use(withAsync({
    adapter: { ... },
    autoLoad: false,  // ← Problem starts here
    total: 1000000,   // Passed from saved snapshot
  }))
  .use(withSnapshots())
  .build();

// Try to restore
const snapshot = { index: 1137, offsetInItem: 41.5 };
list.restoreScroll(snapshot);
```

### What Happens (Network Trace)
```
❌ users?offset=0&limit=25&total=1000000      (WRONG - should be offset ~1137)
```

### Debug Logs
```
[Example] Setting total: 1000000
[Example] total for withAsync: 1000000
[DataManager] Setting initialTotal: 1000000
[DataManager] Total after setting: 1000000

[restoreScroll] Called with snapshot: {index: 1137, offsetInItem: 41.5}
[restoreScroll] Total items: 1000000
[restoreScroll] safeIndex: 1137 offsetInItem: 41.5
[restoreScroll] compression: {isCompressed: false, virtualSize: 0, ...}  ← Problem!
[restoreScroll] Normal mode - offset: 81864
[restoreScroll] Calculated normal scrollPosition: 81905.5
[restoreScroll] containerSize: 598 virtualSize: 0  ← virtualSize is 0!
[restoreScroll] maxScroll: 0  ← maxScroll = max(0, 0 - 598) = 0
[restoreScroll] Before clamp: 81905.5 After clamp: 0  ← Clamped to 0!
[restoreScroll] Final scrolling to position: 0

[restoreScroll] Calling reload now
→ reload() loads offset 0 (wrong!)
```

---

## Root Cause

When `initialTotal` is set in `withAsync`, it calls:
```typescript
storage.setTotal(initialTotal);
notifyStateChange();  // Added to trigger content size update
```

The `notifyStateChange()` triggers:
```typescript
onStateChange: () => {
  ctx.sizeCache.rebuild(ctx.getVirtualTotal());  // ← Rebuilds with 1M
  ctx.updateCompressionMode();
  ctx.updateContentSize(compression.virtualSize);  // ← Should update virtualSize
}
```

**However**, `compression.virtualSize` is still `0` when `restoreScroll()` is called immediately after.

### Why virtualSize is 0

The `getCachedCompression()` returns stale cached values:
```typescript
compression: {
  isCompressed: false,
  actualSize: 0,      // ← Not updated yet
  virtualSize: 0,     // ← Not updated yet  
  ratio: 1
}
```

Even though `ctx.updateContentSize()` was called, the compression cache hasn't been refreshed before `restoreScroll()` runs.

---

## Expected Behavior

### What Should Happen
```
1. Create list with total: 1000000
2. notifyStateChange() triggers content size update
3. virtualSize becomes 72,000,000 (1M × 72px)
4. restoreScroll(snapshot) calculates position: 81,905
5. maxScroll = 72,000,000 - 598 = 71,999,402
6. Position NOT clamped (81,905 < 71,999,402)
7. Scroll to position 81,905
8. reload() loads visible range at position 81,905
9. API request: offset=1125, limit=25 ✓
```

### Network Trace (Expected)
```
✓ users?offset=1125&limit=25&total=1000000    (CORRECT)
```

---

## Solution

### Root Cause (detailed)

Two independent problems combined to break restoration:

1. **sizeCache not rebuilt:** When `autoLoad: false` + `total` is provided, `setTotal()` is called during feature `setup()`. This triggers `notifyStateChange()` → `onStateChange()`, but that callback is gated by `if (ctx.state.isInitialized)` which is `false` during setup. So `sizeCache.rebuild()` never runs, leaving sizeCache with `total=0`. When `restoreScroll` later calls `getCachedCompression()`, it calculates `virtualSize = sizeCache.getTotalSize() = 0 × 72 = 0`.

2. **`reload()` is destructive:** Even if virtualSize were correct, `restoreScroll` called `reload()` via `requestAnimationFrame`. `reload()` calls `dataManager.reload()` which resets `total=0`, shrinks the content to 0px, causes the browser to reset `scrollTop` to 0, then loads from offset 0 — the exact opposite of what restoration needs.

### Fix Applied (two changes)

**Change 1 — `vlist/src/features/snapshots/feature.ts` (restoreScroll):**

Before calculating the scroll position, detect when sizeCache is stale and fix it:
```typescript
const sizeCacheTotal = ctx.sizeCache.getTotal();
if (sizeCacheTotal !== totalItems) {
  ctx.sizeCache.rebuild(totalItems);
  ctx.updateCompressionMode();   // activates compression if needed (withScale)
  const freshCompression = ctx.getCachedCompression();
  ctx.updateContentSize(freshCompression.virtualSize);  // DOM content gets correct height
}
```

After scrolling, use `loadVisibleRange` instead of `reload` to load data at the restored position without resetting:
```typescript
const loadVisibleFn = ctx.methods.get("loadVisibleRange");
if (loadVisibleFn) {
  requestAnimationFrame(() => loadVisibleFn());
}
```

**Change 2 — `vlist/src/features/async/feature.ts` (withAsync):**

Added `loadVisibleRange` method — loads data for the currently visible range without the destructive reset that `reload()` performs:
```typescript
ctx.methods.set("loadVisibleRange", async (): Promise<void> => {
  lastEnsuredRange = null;
  pendingRange = null;
  ctx.forceRender();  // update renderRange at current scroll position
  const { renderRange } = ctx.state.viewportState;
  if (renderRange.end > 0) {
    emitter.emit("load:start", { offset: renderRange.start, limit: ... });
    await ctx.dataManager.ensureRange(renderRange.start, renderRange.end);
  }
});
```

---

## Usage

Snapshot restoration with `autoLoad: false` now works directly:

```javascript
const list = vlist({ ... })
  .use(withAsync({
    adapter: { read: ... },
    autoLoad: false,
    total: savedTotal,  // Pass total from saved state
  }))
  .use(withSnapshots())
  .build();

// Restore on load
const saved = sessionStorage.getItem('scroll');
if (saved) {
  list.restoreScroll(JSON.parse(saved));
  // restoreScroll handles:
  // 1. Rebuilding sizeCache with the correct total
  // 2. Activating compression mode (withScale) if needed
  // 3. Setting content size so the DOM can scroll
  // 4. Calculating and setting the correct scroll position
  // 5. Loading data at the restored visible range (via loadVisibleRange)
} else {
  list.reload();  // No snapshot — load from start
}
```

---

## Related Code

### Files Involved
- `vlist/src/features/snapshots/feature.ts` - `restoreScroll()` implementation
- `vlist/src/features/async/feature.ts` - `withAsync` setup, passes `initialTotal`
- `vlist/src/features/async/manager.ts` - Sets initial total, calls `notifyStateChange()`
- `vlist.dev/examples/data/velocity-loading/` - Example demonstrating the issue

### Key Functions
- `restoreScroll(snapshot)` - Calculates and sets scroll position
- `getCachedCompression()` - Returns cached compression state (stale?)
- `updateContentSize(size)` - Should update virtualSize
- `notifyStateChange()` - Triggers onStateChange callback

---

## Debug Commands

To reproduce and debug:

```bash
# In velocity-loading example:
# 1. Scroll to position (e.g., index 1137)
# 2. Snapshot is auto-saved to sessionStorage
# 3. Reload page
# 4. Check console logs and Network tab

# Expected: Single request to offset ~1125
# Actual: Request to offset 0

# Key logs to watch:
[DataManager] Setting initialTotal: 1000000
[restoreScroll] virtualSize: 0          ← Should be 72000000!
[restoreScroll] maxScroll: 0            ← Should be ~72000000!
[restoreScroll] Before clamp: 81905 After clamp: 0  ← Should NOT clamp!
```

---

## Impact

**High severity** because:
- ✅ Snapshot save works perfectly
- ❌ Snapshot restore doesn't work with `autoLoad: false`
- ❌ Always loads from offset 0 on page reload
- ❌ Bad UX: user loses their scroll position
- ❌ Unnecessary API request to offset 0
- ❌ Breaks the entire purpose of the snapshots feature

**Affects:**
- Any app using `withSnapshots` + `withAsync({ autoLoad: false })`
- Particularly problematic for:
  - Velocity-based loading (needs `autoLoad: false` to avoid loading offset 0)
  - Apps that want to control when data loads
  - Apps optimizing initial load performance

---

## Tests

All 1548 existing tests pass after the fix. The async feature test was updated to expect the new `loadVisibleRange` method in the methods array.

---

**Last Updated:** January 2025  
**Fixed:** January 2025  
**Reporter:** Development team