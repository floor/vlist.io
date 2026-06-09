---
id: "023"
title: "Carousel snap animation feels like a two-step process"
severity: low
status: resolved
component: plugins/carousel, core/runway
related: []
---

> **Resolution (predictive snap + velocity-seeded spring):** two parts.
>
> **1. When the snap starts (predictive trigger).** `onAfterScroll` tracks
> per-frame *signed* velocity; once a real (above-threshold) scroll is observed
> and then settles below `SNAP_VELOCITY_THRESHOLD` (0.4 px/ms) for
> `SNAP_SETTLE_FRAMES` (2) consecutive frames, the snap fires immediately instead
> of waiting for the idle timeout. `onIdle` remains the fallback for cases with
> no momentum tail (e.g. discrete mouse-wheel clicks), seeding the snap from rest
> (velocity 0). The shared `performSnap(velocity)` preserves direction-aware
> ceil/floor snapping. The general idle timeout and its other consumers are
> unchanged.
>
> **2. How the snap animates (seamless handoff).** The earlier duration+easing
> tween left a *velocity discontinuity* at the handoff — the fling decelerates
> at velocity `V`, but a fresh easeOut tween starts at `3·distance/duration ≠ V`.
> That jump is the residual choppiness; tuning duration/easing only resizes it.
> The fix is a single velocity-continuous motion: a **critically damped spring**
> (`src/core/runway.ts` → `springScrollTo`) seeded with the live settle velocity.
> Position *and* velocity stay continuous (C1) across the handoff, so there is no
> seam. `SPRING_STIFFNESS` ω = 0.009 /ms settles (~2%) in ≈ 640ms; a land guard
> snaps exactly onto the target without overshoot. Exposed via
> `PluginContext.springScrollTo` (falls back to an instant jump in native scroll
> mode). Programmatic nav (`next`/`prev`/`goTo`) still uses the duration tween —
> deliberate jumps from rest have no incoming velocity, so no seam exists.
>
> **3. The remaining felt discontinuity was plumbing, not physics.** In wrap mode
> every wheel event drives `setLogical` synchronously, and the OS keeps emitting
> decaying *momentum-phase* wheel events after the snap fires. `cancelScroll`
> only cancels the rAF — the wheel listener stays live — so each spring frame
> wrote its integrated trajectory while interleaved momentum events wrote a
> different `scrollPosition`, and the paint ping-ponged between them (micro-
> stutter). It also let a late momentum event nudge off-target after landing,
> triggering a second idle re-snap. Fix: a `springActive` flag in `runway.ts`.
> While the spring owns motion, `onWheelEvent` swallows the decaying momentum
> tail (deltas below `SPRING_INTERRUPT_DELTA` = 12px) so it can't fight the
> trajectory; a larger delta is a fresh, deliberate push that cancels the snap
> and resumes free scrolling.
>
> **Cancellation must settle the caller.** Introducing cancellation surfaced a
> latent wedge: `performSnap` sets `snapAnimating = true` and relies on the
> spring's `onComplete` to clear it, but `cancelScroll` killed the rAF without
> firing `onComplete`. An interrupted snap (fresh gesture or programmatic nav)
> then left `snapAnimating` stuck `true`, permanently disabling both the
> predictive trigger and the idle fallback — the carousel never snapped again.
> Fix: `cancelScroll` now fires the in-flight spring's completion callback
> (a `springComplete` slot), so the snap state resets on cancel as well as on
> landing. Reproduced in the real browser by
> `vlist.io/scripts/debug/tests/carousel-snap-fling.mjs` (a wheel fling
> interrupted by a second fling, then a third fling that must still snap).
---

# Issue 023: Carousel snap animation feels like a two-step process

---

## Symptom

When scrolling a carousel via wheel/trackpad with `snap: true`, the user sees a visible two-step motion:

1. The scroll decelerates and stops (idle timeout fires)
2. After a perceptible pause, the snap animation kicks in and slides to the nearest item

This pause between "scroll stops" and "snap starts" makes the interaction feel mechanical rather than fluid. The effect is most noticeable with the `"static"` variant where items are viewport-sized (e.g. the plugin-wizard example), but applies to all snapping carousels.

## Root cause

The snap logic lives in the carousel's `onIdle` hook, which fires after the bounded handler's idle timeout (`SCROLL_IDLE_TIMEOUT`, default 200ms). The idle timeout is designed to detect when scrolling has stopped — it resets on every scroll frame and only fires once no scroll events arrive for the full duration.

This means snap cannot begin until 200ms after the last scroll frame. During those 200ms the carousel sits at whatever position it landed at, visually misaligned from any item boundary. Then `smoothScrollTo` kicks in with its own duration (default 400ms). Total time from last scroll input to snap completion: ~600ms, with a dead gap in the middle.

### Why this is architecturally tricky

The idle timeout serves multiple purposes beyond snap:

- `scrollDirection` reset (used by velocity tracking, event emission)
- `scroll:idle` event emission (used by data plugin for deferred loads)
- `isScrolling` class removal (CSS uses this to suppress transitions during scroll)
- Bounded handler rebase settling

Reducing the idle timeout globally would make all of these fire too early. And the carousel can't start the snap animation while scroll events are still arriving — it would fight with the user's input.

## Proposed fix

Decouple snap from the general idle timeout. Two possible approaches:

### A. Predictive snap (preferred)

During active scrolling, continuously compute what the snap target *would be* given the current position and direction. When the scroll velocity drops below a threshold (e.g. < 0.5 px/ms for 2+ consecutive frames), begin the snap animation immediately — don't wait for full idle. The snap animation target is a moving value (recalculated each frame based on the latest position), so it self-corrects if a late wheel event arrives.

Key changes:
- Track velocity in `onAfterScroll` (carousel already has access to `engineState`)
- Add a `snapPending` state that triggers `smoothScrollTo` before idle
- The bounded handler's `smoothScrollTo` already supports `targetOrFn` (a function that returns the target) — use this so the snap target updates dynamically
- Cancel the predictive snap if a new scroll input arrives (existing `cancelScroll` handles this)

### B. Shorter snap-specific idle

Add a separate, shorter timer (e.g. 80ms) in the carousel that triggers snap independently of the general idle timeout. This is simpler but still produces a visible (if shorter) pause.

## Scope

- Only affects carousel plugin with `snap: true`
- The general idle timeout and its consumers should not change
- Direction-aware snap (ceil/floor based on scroll direction) must be preserved
- Smooth scroll animation (`smoothScrollTo`) is the right primitive — the issue is *when* it starts, not how it animates

## Files

- `src/plugins/carousel/plugin.ts` — `onIdle` snap logic, `onAfterScroll` direction tracking
- `src/core/runway.ts` — `smoothScrollTo` supports `targetOrFn` (dynamic target), idle timeout scheduling
- `src/core/velocity.ts` — velocity tracking (may need to expose per-frame values to plugins)

## Related context

- The `baseOffset` fast-path fix (pipeline `prevBaseOffset` check) ensures transforms update every frame during snap animation — prerequisite for smooth visual feedback
- Direction-aware snap (ceil/floor) was just added — any predictive snap must preserve this
