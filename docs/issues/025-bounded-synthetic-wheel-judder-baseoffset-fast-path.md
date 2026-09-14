---
id: "025"
title: Bounded and synthetic modes judder on wheel because the range-unchanged fast path skips baseOffset moves
severity: high
status: fixed
component: core/pipeline
related: ["003", "021"]
---

# Issue 025: Bounded and synthetic modes judder on wheel because the range-unchanged fast path skips baseOffset moves

---

## Symptom

Reported by jvial on 2026-09-14 while testing the RFC-014 integration branch locally on a
MacBook Pro (120 Hz ProMotion display): scrolling the large-list example with the trackpad
felt jerky during deceleration in **bounded** and **synthetic** mode, while **native** mode
was smooth. Subtle, but consistent, and reproduced in Chromium, Firefox and Safari. A mouse
wheel (Logitech MX Anywhere 3S) was "almost perfect". The report stated that bounded mode
probably behaved this way before the synthetic driver existed, which turned out to be true.

## Root cause

`phase1Calculate` in `src/core/pipeline.ts` has a range-unchanged fast path:

```ts
if (renderStart === state.prevRangeStart && renderEnd === state.prevRangeEnd && !state.renderPending) {
  return false; // no phase 2, no DOM writes
}
```

Item transforms are `offset - state.baseOffset + startPadding` (`pipeline.ts:300, 367`).
In native mode `baseOffset` is always 0 and the browser moves the rows through the scroll
container, so skipping phase 2 when the range is unchanged is correct.

In bounded mode on wheel, `applySplit` (`src/core/runway.ts`) recentres `scrollTop` on the
runway on every event, so in the middle of a large list **all** motion lives in
`baseOffset`. In synthetic mode `baseOffset` is set equal to the logical position on every
commit by design. In both cases the row transforms change on every position change, but
the fast path only looks at the range: whenever a position change does not cross a row
boundary at either edge of the rendered range, phase 2 is skipped and the rows do not move.
At speed the range changes every frame and nothing is visible. During a trackpad
deceleration, steps of 5-30 px against 48-52 px rows cross a boundary only every two to
five frames, so the rows stand still and then lurch a row's worth: 24-36 px steps against a
steady 12 px logical advance.

Bounded touch was never affected because native scrolling of the runway moves the rows
through `scrollTop` until a rebase near a runway edge, which changes the range anyway.

## Why the logical numbers looked identical

Every probe that read `list.getScrollPosition()` showed native, bounded and synthetic
moving in the same frames by the same amounts, because the logical position was correct in
all three. The defect was between the logical position and the DOM. Only a probe reading a
rendered row's `getBoundingClientRect()` every frame could see it.

## Resolution process, recorded because it went wrong before it went right

1. A first Chrome probe sampled a row element's screen position per frame under an emulated
   decelerating wheel sequence and found native moving in 94 frames, bounded in 41,
   synthetic in 27. **This was the bug.** It was dismissed as a sampler artifact when a
   second probe, reading the logical position instead, showed 94/94/93.
2. Codex independently reproduced the second probe's parity from a clean export, which
   reinforced the wrong conclusion. Six hypotheses followed, each tested and each wrong:
   Chrome coalescing input on a busy main thread; the custom scrollbar plugin; the
   `will-change: transform` promotion of rows resampling fractional transforms on Retina;
   sub-pixel positions (a build snapping positions to physical pixels changed nothing);
   the 150 ms idle path firing inside the momentum tail; and per-event rendering versus
   frame batching, for which two patched builds (batched, and batched plus eased) were
   built and felt: both still jerky.
3. Two things broke the loop. An in-page recorder added to the large-list example printed
   per-frame steps, gaps and wheel-event counts from jvial's real gestures, which
   established the 120 Hz display and that event delivery was identical across modes. And
   a four-way A/B page that moved the same 1M-row list by scrollTop, by per-row transforms,
   by one composited layer, and by one layer batched per frame was smooth in all four,
   which proved the rendering mechanism innocent and pointed at what vlist does per frame
   that the hand-rolled page did not.
4. Reading the pipeline's frame path found the fast path. A DOM-level probe (40 wheel
   steps of 12 px, first visible row's screen position sampled every frame) confirmed it:

   | mode | logical moves | DOM moves before | DOM moves after |
   |---|---|---|---|
   | native | 40 | 40 | 40 |
   | bounded | 40 | 18 | 40 |
   | synthetic | 40 | 18 | 40 |

   jvial confirmed by feel on the same bare page: smooth in both logical modes with the fix.

Total elapsed from report to confirmed fix: one afternoon. The cost was the dismissal in
step 1; the first measurement was right.

## Fix

floor/vlist#135, released as **v2.6.5** (2026-09-14) on the patch train and merged into
`feat/synthetic-input` for 2.7. `EngineState` gains `prevBaseOffset`, set at each phase-1
commit; the fast path adds `state.baseOffset === state.prevBaseOffset`. Native mode is
byte-for-byte unaffected (`baseOffset` stays 0). Base bundle unchanged at 9.8 KB gzipped.

Discarded on the way: wheel batching, notch easing, position snapping, layer promotion
changes. None addressed the cause; frame batching remains a possible optimisation but is
not needed for smoothness.

## Tests and regression coverage

- `test/core/pipeline.test.ts`: `phase1Calculate` commits again when `baseOffset` moves
  with an unchanged range, then returns to the fast path.
- `test/core/runway.test.ts`: bounded wheel mid-list, 12 steps of 12 px move the first
  rendered item's transform on every step. Both fail without the fix.
- vlist.io#63: the RFC-014 pointer-fling benchmark scenario now asserts the rendered row
  position against the logical delta every frame (0.05 px tolerance), so this class of
  defect fails the benchmark instead of passing on logical numbers.

## Addendum 2026-09-14: the same defect in grid, table and tree

After 2.7.0, jvial reported the same judder in the grid layout. The three plugins that
replace the core renderer (`grid`, `table`, `tree`) carry their own copy of the
range-unchanged fast path, without the `baseOffset` guard added to core in 2.6.5. Grid is
the worst case: with 128 px rows the range crosses a boundary even less often, and the
DOM-level probe showed rows moving on 7 of 40 frames in bounded and synthetic mode
(44-48 px lurches) against 40 of 40 in native. Masonry was unaffected because it keys its
render on the scroll position; groups already guarded with its own
`lastRenderBaseOffset`.

The tree renderer had a second, older defect: it never subtracted `baseOffset` from its
row transforms, so in bounded mode past the first runway its rows sat at absolute offsets.

Masonry turned out not to be clean either, for a third reason: it re-renders on every
position change, but its release grace period keeps items that just left the visible set
alive with their old transform. In native mode those are off-screen; in the logical
modes `baseOffset` has moved, so after a jump to the middle of 100K items 21 stale items
sat inside the viewport on top of the new range, and on wheel they lagged by one frame's
`baseOffset` delta (a tracked item moved on 36 of 40 frames). Grace-period items now
follow the current `baseOffset`.

Measured on the fixed branch, single tracked item across 40 wheel steps: grid, table and
masonry all move on 40 of 40 frames in every mode, identical to native.

Fix: floor/vlist#138, released as **v2.7.1** (2026-09-14). The same guard in all three fast paths, and the tree
renders at `offset - baseOffset`. After the fix the grid probe reads 40 of 40 in every
mode with identical steps. Lesson added below: a fix in core does not reach renderers
that replace core; search for every copy of the pattern.

## Lessons

- **Measure what the user sees.** For a virtual list the logical position is an
  intermediate value; a smoothness probe must read the DOM. Every logical-only measurement
  in this investigation was consistent with a broken renderer.
- **A measurement that contradicts a later one is not automatically the artifact.** The
  two probes measured different things; the discrepancy itself was the finding.
- **Isolate mechanism from implementation with a hand-rolled control.** The four-way A/B
  page cost twenty minutes and eliminated the whole compositing family of hypotheses at
  once.
- **Real-input recorders beat emulated input for feel problems.** CDP-dispatched wheel
  events could not reproduce what a 120 Hz trackpad delivers; a tiny in-page recorder
  printing per-frame data from the real gesture could.
- **A fix in core does not reach plugins that replace core.** Five renderers had their own
  copy of the fast path; the 2.6.5 fix covered one. When a defect is a pattern, grep for
  the pattern across the tree before closing the issue.
