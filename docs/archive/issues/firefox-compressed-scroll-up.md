# Firefox Compressed Scroll Up Bug

## Status
✅ **FIXED** - Smooth scroll interpolation (lerp) in wheel handler breaks exact item-height alignment

## Environment
- **Browser**: Firefox only (Chrome, Brave, Safari work correctly)
- **Mode**: Compressed lists only (`withScale` feature)
- **Scroll Direction**: Scroll UP only (scroll down works fine)
- **Input Method**: Mouse wheel only (touchpad works correctly)

## The Issue

When scrolling UP with the mouse wheel in Firefox, items are positioned with `translateY` values that **repeat every 72px** (item height), causing new items to visually stack at the same positions as the items they replace.

## Root Cause - The Math

The bug occurs because Firefox's mouse wheel produces specific deltaY values that create a **constant fractional part** in the virtual scroll index calculation.

### The Calculation

```typescript
const scrollRatio = scrollPosition / virtualSize;
const virtualScrollIndex = scrollRatio * totalItems;
const virtualScrollOffset = getOffsetForVirtualIndex(sizeCache, virtualScrollIndex, totalItems);

// getOffsetForVirtualIndex interpolates:
const intPart = Math.floor(virtualScrollIndex);
const fracPart = virtualScrollIndex - intPart;
return sizeCache.getOffset(intPart) + fracPart * sizeCache.getSize(intPart);
```

### Firefox Scroll UP Pattern

When scrolling UP in Firefox with mouse wheel (deltaY ≈ -16px):

```
scrollPosition=57: vIdx=3.5625 → virtOff = 216 + 0.5625×72 = 256.50
scrollPosition=41: vIdx=2.5625 → virtOff = 144 + 0.5625×72 = 184.50  (diff: 72px!)
scrollPosition=25: vIdx=1.5625 → virtOff = 72  + 0.5625×72 = 112.50  (diff: 72px!)
scrollPosition=9:  vIdx=0.5625 → virtOff = 0   + 0.5625×72 = 40.50   (diff: 72px!)
```

**The fractional part stays EXACTLY 0.5625** because:
- Firefox deltaY = -16px per tick
- scrollPosition decreases by 16px each time
- 16 / 16,000,000 × 1,000,000 = 1.0 in virtual index space
- virtualIndex decreases by exactly 1.0, maintaining the same fractional part

### Why Chrome Works

Chrome uses different wheel deltaY values (4px increments), causing variable fractional parts:

```
scrollPosition=12: vIdx=0.7500 (frac=0.7500) → virtOff=54.00
scrollPosition=8:  vIdx=0.5000 (frac=0.5000) → virtOff=36.00  (diff: 18px ✓)
scrollPosition=4:  vIdx=0.2500 (frac=0.2500) → virtOff=18.00  (diff: 18px ✓)
```

### Why Firefox Scroll DOWN Works

When scrolling DOWN in Firefox (deltaY ≈ +19px):

```
scrollPosition=0:  vIdx=0.0000 (frac=0.0000) → virtOff=0.00
scrollPosition=19: vIdx=1.1875 (frac=0.1875) → virtOff=85.50   (diff: 85.50px ✓)
scrollPosition=38: vIdx=2.3750 (frac=0.3750) → virtOff=171.00  (diff: 85.50px ✓)
scrollPosition=57: vIdx=3.5625 (frac=0.5625) → virtOff=256.50  (diff: 85.50px ✓)
```

The fractional part CHANGES (0.0000 → 0.1875 → 0.3750 → 0.5625), producing smooth offsets.

## The Consequence

When `virtualScrollOffset` changes by exactly 72px and items shift by one index:

**At scrollPosition=57:**
- Item 3 (index=2): offset = 144 - 256.50 = **-112.50px**
- Item 4 (index=3): offset = 216 - 256.50 = **-40.50px**

**At scrollPosition=41 (after scroll up):**
- Item 2 (index=1): offset = 72 - 184.50 = **-112.50px** ← SAME!
- Item 3 (index=2): offset = 144 - 184.50 = **-40.50px** ← SAME!

New items land at the exact positions of the old items, creating the stacking effect.

## Evidence - Actual Logs

### Firefox Scroll UP (broken)
```
st=57, vIdx=3.5625 (3+0.5625), virtOff=256.50, result=-257 → translateY=-256px
st=41, vIdx=2.5625 (2+0.5625), virtOff=184.50, result=-185 → translateY=-184px
st=25, vIdx=1.5625 (1+0.5625), virtOff=112.50, result=-113 → translateY=-112px
st=9,  vIdx=0.5625 (0+0.5625), virtOff=40.50,  result=-41  → translateY=-40px
```

Notice: `virtOff` decreases by exactly 72px each time (256.50→184.50→112.50→40.50)

### Firefox Scroll DOWN (works)
```
st=0,  vIdx=0.0000 (0+0.0000), virtOff=0.00,   result=0    → translateY=0px
st=19, vIdx=1.1875 (1+0.1875), virtOff=85.50,  result=-86  → translateY=-85px
st=38, vIdx=2.3750 (2+0.3750), virtOff=171.00, result=-171 → translateY=-171px
st=57, vIdx=3.5625 (3+0.5625), virtOff=256.50, result=-257 → translateY=-256px
```

Notice: `virtOff` increases by 85-86px each time (variable, smooth)

## Test Configuration

```javascript
const list = vlist({
  container: "#list-container",
  item: { height: 72, template: itemTemplate },
})
  .use(withScale())  // ← Compression feature
  .build();
```

- Total items: 1,000,000
- Item height: 72px
- Virtual height: 16,000,000px
- Compression ratio: 0.222222

## Reproduction Steps

1. Open **Firefox** (any recent version)
2. Load: `sandbox/data/velocity-loading/javascript/`
3. Scroll down 3-4 ticks with mouse wheel (works fine)
4. Scroll UP 3-4 ticks with mouse wheel
5. **Observe**: Items don't move smoothly - they jump/stack at same positions

## Why This Happens

Firefox's mouse wheel implementation produces specific deltaY values:
- **Scroll UP**: deltaY ≈ -16px → scrollPosition decreases by 16px
- **Scroll DOWN**: deltaY ≈ +19px → scrollPosition increases by 19px

With compression ratio 16M/72M = 0.222222:
- **16px in virtual space = 1.0 in index space** → fractional part stays constant!
- **19px in virtual space ≈ 1.1875 in index space** → fractional part changes ✓

## Files Involved

- **`vlist/src/rendering/scale.ts`** (lines 273-298) - `calculateCompressedItemPosition()`
  - Line 276: `getOffsetForVirtualIndex()` - Uses fractional interpolation
- **`vlist/src/rendering/heights.ts`** (lines 261-275) - `getOffsetForVirtualIndex()`
  - This function assumes smooth fractional changes, fails with constant fractions

## Attempted Fixes (Before Solution)

### 1. Direct scrollPosition Calculation (FAILED)
**Approach:** Calculate `virtualScrollOffset = (scrollPosition / virtualSize) * actualSize`

**Why it failed:** Mathematically equivalent to the original formula:
- Old: `getOffsetForVirtualIndex(virtualScrollIndex)` 
- New: `scrollRatio * actualHeight`
- Both equal: `scrollTop * (actualHeight / virtualHeight)`

Result: Produces identical values, doesn't fix the 72px jump pattern.

### 2. Relative Positioning from First Item (FAILED)
**Approach:** Calculate first visible item's position, then position others with fixed offsets:
```typescript
if (firstItemPosition === null) {
  firstItemPosition = calculateCompressedItemPosition(firstIndex, scrollTop, ...)
}
offset = firstItemPosition + (itemOffset(index) - itemOffset(firstIndex))
```

**Why it failed:** The first item's position STILL uses the problematic formula which has the 72px jump. All subsequent items inherit this jumped position.

### 3. Infrastructure Fixes (NECESSARY but not sufficient)
✅ Wire `scrollIsCompressed` flag in `core.ts` (lines 1564-1568)
✅ Reposition items when range unchanged in compressed mode (lines 847-856)

These are required for any solution to work properly but don't fix the core math problem.

## Solution: Smooth Scroll Interpolation (Lerp)

### Key Insight

The positioning math itself is correct — the problem is that Firefox's wheel delta (-16px) maps to exactly one item height (72px) in actual space via the compression ratio (4.5×). This means:
- The math **cannot** be fixed by changing the positioning formula (all linear formulas produce the same result)
- The fix must change the **input** (scrollTop values) so that per-frame deltas don't align with item height

### The Fix

Replace the immediate wheel handler with **lerp-based smooth scroll interpolation** in `vlist/src/features/scale/feature.ts`.

Instead of immediately setting `virtualScrollTop += deltaY`, we:
1. Accumulate deltaY into a `targetScrollTop`
2. On each animation frame, move `virtualScrollTop` toward `targetScrollTop` by a fraction (65%)
3. This produces intermediate scroll positions that break the exact 72px alignment

```typescript
// Constants
const LERP_FACTOR = 0.65;  // Move 65% of remaining distance per frame
const SNAP_THRESHOLD = 0.5; // Snap when < 0.5px remaining

// Wheel handler — accumulates into target, starts animation
const wheelHandler = (e: WheelEvent): void => {
  e.preventDefault();
  targetScrollTop = clamp(targetScrollTop + e.deltaY, 0, maxScroll);
  if (smoothScrollId === null) {
    smoothScrollId = requestAnimationFrame(smoothScrollTick);
  }
};

// Animation tick — converges toward target over multiple frames
const smoothScrollTick = (): void => {
  const diff = targetScrollTop - virtualScrollTop;
  if (Math.abs(diff) < SNAP_THRESHOLD) {
    virtualScrollTop = targetScrollTop;
    smoothScrollId = null;
  } else {
    virtualScrollTop += diff * LERP_FACTOR;
    smoothScrollId = requestAnimationFrame(smoothScrollTick);
  }
  ctx.scrollController.scrollTo(virtualScrollTop);
};
```

### Why It Works

For a Firefox scroll-up tick (deltaY = -16px) with lerp = 0.65:

| Frame | Δ virtualScrollTop | Δ actualOffset | Multiple of 72? |
|-------|-------------------|----------------|-----------------|
| 1 | -10.4px | -46.8px | ❌ No |
| 2 | -3.64px | -16.4px | ❌ No |
| 3 | -1.27px | -5.7px | ❌ No |
| 4 | -0.45px | -2.0px | ❌ No |
| snap | -0.24px | -1.1px | ❌ No |
| **Total** | **-16.0px** | **-72.0px** | (final position is correct) |

Each frame produces a **different, non-aligned** actual offset change. Items visually shift by varying amounts per frame, producing smooth scrolling instead of discrete 72px jumps.

### Additional Benefits

1. **Cross-browser consistency** — smoother scrolling in all browsers, not just Firefox
2. **Better performance** — coalesces multiple wheel events per animation frame
3. **External scroll sync** — scrollbar drag and `scrollToIndex` immediately cancel the animation and set position directly via `setScrollFns`

### Why mtrl-addons Didn't Have This Bug

mtrl-addons has a `smoothing` option in its wheel handler that multiplies deltaY by 0.3, which similarly breaks the exact alignment. Their math is otherwise identical: `(index - scrollRatio * totalItems) * itemSize`.

### Files Changed

- **`vlist/src/features/scale/feature.ts`** — Smooth scroll interpolation in wheel handler
- **`vlist/src/rendering/scale.ts`** — Removed debug logging, cleaned up comments

---

**Created**: 2026-01-29  
**Fixed**: 2026-01-30  
**Solution**: Lerp-based smooth scroll interpolation in compressed wheel handler
