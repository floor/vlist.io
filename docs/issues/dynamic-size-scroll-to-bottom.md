# Dynamic Size: `scrollToIndex` doesn't reach the bottom

> `scrollToIndex(lastIndex, { align: "end" })` in dynamic size mode lands several items short of the actual bottom.

**Status:** In progress — partial fix in `api.ts`, needs rework  
**Affects:** `src/builder/api.ts`, `src/builder/measurement.ts`, `src/builder/core.ts`  
**Example:** `examples/variable-sizes` → Mode B → jump-bottom button

---

## The Problem

In dynamic size mode (`estimatedHeight`), most items have never been rendered, so the `SizeCache` contains estimated sizes (e.g., 200px each). When `scrollToIndex(4999, { align: "end" })` is called:

1. `calcScrollToPosition` computes the target from **estimated** prefix sums (~1,059,229px)
2. Smooth scroll animates to that position
3. As items near the target render, `ResizeObserver` measures them — actual sizes differ from 200px
4. `pendingScrollDelta` corrections shift `scrollTop` during the animation
5. After the animation ends, only ~191/5000 items have been measured
6. The total content size has drifted by thousands of pixels
7. The user ends up several cards short of the real bottom

In fixed/variable size mode (Mode A) this works perfectly because all sizes are known upfront — `calcScrollToPosition` computes the exact position.

## Root Cause

The fundamental issue is that `calcScrollToPosition` returns a position computed from a `SizeCache` where ~96% of entries are estimates. The scroll target is wrong from the start, and measurements during the animation make it progressively more wrong.

The content size update is also **deferred** during scrolling (`pendingContentSizeUpdate = true` in `measurement.ts`). On `scroll:idle`, `flushMeasurements()` updates `dom.content.style.height`, but the DOM hasn't reflowed yet — so `scrollHeight` still reflects the old layout in the same JS tick.

## Current Partial Fix (needs rework)

The current branch adds `correctAfterMeasurement()` in `api.ts` with two strategies:

### Strategy 1: Iterative rAF correction (reverted — too jarring)
Looped: wait 2 rAF → recompute target → correct → repeat. Each correction teleported the viewport by thousands of pixels, causing the viewport to go blank and re-render. Completely unacceptable UX.

### Strategy 2: scroll:idle + maxScroll snap (current — incomplete)
For last-item + `align: "end"`, listens for `scroll:idle`, then in a rAF reads `scrollHeight - clientHeight` to find the real DOM max scroll. Problem: after `flushMeasurements()` updates the content div height in the same idle callback, `scrollHeight` still returns the old value (DOM hasn't reflowed). Adding one rAF delay fixes the reflow timing but the correction is a single shot — subsequent measurements after the snap aren't handled.

### What's in the diff

```
src/builder/api.ts:
  - measurementEnabled parameter added to createApi()
  - animateScroll gains onComplete callback
  - correctAfterMeasurement() with scroll:idle listener + rAF
  - pendingScrollIdleUnsub cleanup on destroy
  - Debug console.log statements (to be removed)

src/builder/core.ts:
  - Passes measurementEnabled to createApi()
```

## Debug Logs Still Present

Remove these before merging:
- `[scrollToIndex]` log in `api.ts` scrollToIndex
- `[correctEnd:idle]` log in `api.ts` correctAfterMeasurement

## Investigation Notes

### Timing trace (from debug session)

```
[scrollToIndex] idx=4999 align=end target=1059229.4  measured=9/5000
  ... 15 ResizeObserver batches during smooth scroll ...
  ... measured grows to ~191/5000, totalSize drifts to ~1066917 ...
[correctEnd:idle] current=1059365.5  maxScroll=0.0  scrollHeight=358  clientSize=358
  → scrollHeight=358 means DOM hasn't reflowed after flushMeasurements()
```

After adding rAF delay:
```
[correctEnd:idle] current=1059365.5  maxScroll=<real value>  drift=~6800
  → Single correction snaps, but more measurements arrive after
```

### Key observations

1. **Only ~4% of items are measured** when the animation ends — the scroll target is fundamentally unreliable
2. **Content size deferral** causes `scrollHeight` to be stale in the idle callback
3. **Single-shot correction** isn't enough — the snap renders new items, which trigger more measurements, which change the content size again
4. **Large teleports** (6000+ px) cause blank viewport — unacceptable UX

## Possible Approaches

### A. Repeated idle-snap loop (careful version)
Keep the scroll:idle listener subscribed across multiple idle cycles. On each idle: flush → rAF → read scrollHeight → snap if not at bottom → re-subscribe. Stop when `maxScroll - current < threshold` for two consecutive idles. Risk: still may cause visible jumps if the deltas are large between flushes.

### B. Smooth chase animation
Instead of instant `$.sst(maxScroll)`, animate smoothly from current to the corrected position using `animateScroll`. This masks the correction as continued scrolling. Each time the animation ends, check if we're at the real bottom; if not, animate again. The user sees continuous motion toward the bottom rather than a teleport.

### C. Two-phase scroll
1. **Phase 1:** Instant-jump to an estimated position (no animation), render + measure items there
2. **Phase 2:** Once measurements stabilize near the target, do a short smooth scroll to the exact bottom

This avoids the "smooth scroll to wrong position then correct" problem entirely.

### D. Bottom-pinning mode
When `scrollToIndex(last, "end")` is called in dynamic size mode, enter a temporary "pin to bottom" state. While pinned, every `ResizeObserver` callback and every content size update automatically snaps `scrollTop` to `maxScroll`. The pin deactivates on the next user-initiated scroll event. This is similar to how chat UIs handle "stick to bottom" — the `stayAtEnd` logic in `measurement.ts` already has the bones of this.

### E. Pre-render the last page
Before scrolling, render the last ~20 items in a hidden container (or the real container at the target position without animation), let ResizeObserver measure them, then scroll to the now-known position. This would produce pixel-perfect results but adds latency.

## Recommendation

**Approach D (bottom-pinning)** is the most robust:
- Reuses existing `stayAtEnd` infrastructure in `measurement.ts`
- No animation trickery or multi-pass correction loops
- Works regardless of how many measurement batches arrive
- Natural exit condition (user scrolls away)
- Matches user intent: "I want to be at the bottom"

The implementation would be:
1. `scrollToIndex` sets a `pinnedToBottom = true` flag when `idx === last && align === "end"` in dynamic size mode
2. The ResizeObserver callback in `measurement.ts` checks the flag — if set, after rebuilding prefix sums and updating content size, snap `scrollTop` to `maxScroll`
3. The flag clears on the next user-initiated scroll event (not programmatic scroll)
4. Clean up on destroy

## Related

- [measurement.md](../internals/measurement.md) — Mode B architecture, `stayAtEnd` logic
- `src/builder/measurement.ts` — `stayAtEnd()`, `flushMeasurements()`, ResizeObserver callback
- `src/builder/api.ts` — `scrollToIndex`, `correctAfterMeasurement` (current partial fix)
- `src/builder/range.ts` — `calcScrollToPosition` (computes target from SizeCache)