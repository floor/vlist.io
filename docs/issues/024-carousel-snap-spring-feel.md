---
id: "024"
title: "Carousel snap spring has residual elasticity and momentum fight"
severity: low
status: open
component: plugins/carousel, core/runway
related: ["023"]
---

# Issue 024: Carousel snap spring has residual elasticity and momentum fight

---

## Symptom

After the issue 023 fix (predictive snap + velocity-seeded spring), two problems remain:

1. **Elastic feel.** The critically damped spring's velocity profile has an acceleration phase before decelerating — even though position never overshoots, the motion *feels* bouncy rather than direct. The user perceives a soft, spring-like pull instead of a crisp deceleration to the boundary. This is most visible on short snaps (dead-zone rubber-band back to the current item).

2. **Momentum fight.** After the snap fires, macOS trackpad momentum events keep arriving via `onWheelEvent` → `setLogical`, moving `scrollPosition` away from the spring's trajectory. The spring writes it back on its next rAF tick, but the interleaved writes create micro-stutter. The spring's re-seeding path (`performSnap(v)` on each momentum event) restarts the spring repeatedly, compounding the visual noise.

## Root cause

### Elasticity

The critically damped spring `x(t) = target + (A + B·t)·e^(-ω·t)` is mathematically overshoot-free, but its velocity profile is non-monotonic: when seeded with velocity, it can *accelerate* before decelerating (the restoring force adds to the initial momentum before the damping overtakes). This characteristic acceleration-then-deceleration is what separates a spring from a pure ease-out curve and creates the elastic sensation.

For the idle fallback (velocity = 0), the spring starts from rest with an ease-in-out profile (accelerates from zero, then decelerates). On a small snap (< 25% of stepSize), this reads as a sluggish rubber-band rather than a responsive snap-back.

### Momentum fight

`onWheelEvent` in `runway.ts` has no mechanism to suppress events during a snap animation. The `springActive` flag described in the issue 023 resolution notes was never implemented. Each momentum event either:

- **Re-seeds the spring** (current behavior): stops the old spring, creates a new one from the displaced position. Constant restarts = micro-stutter.
- **Moves position unchecked**: the spring and momentum alternate writing `scrollPosition`, causing ping-pong between two trajectories.

## Attempted fixes (not landed)

Several approaches were explored during the session:

### A. Dead-zone + position undo (partially worked)

- Added a 25% dead-zone to `performSnap`: small displacement snaps to nearest regardless of direction (fixes the "small scroll snaps wrong way" issue).
- In `onAfterScroll`, when `snapAnimating`, computed `|pos - lastSpringPos|`. Small delta → reverted position back to the spring's last known value via `ctx.scrollTo`. Large delta → treated as fresh gesture, cancelled the snap.
- **Problem**: macOS momentum deltas can easily exceed 25px, so they triggered "fresh gesture" detection, cancelled the snap, and the cycle repeated — causing a bounce.

### B. Ease-out curve replacing the spring

- Replaced `createSnapSpring` with a cubic ease-out `1 - (1-t)³`. Pure deceleration, no acceleration phase.
- Duration adapted to velocity: `3·d/v` for velocity-continuous handoff, clamped to [150, 600]ms.
- **Problem**: still bounced because the momentum fight was unsolved — the ease-out was clean but momentum events still displaced the position between frames.

### C. Wheel filter on the bounded handler

- Added `wheelFilter` property to `BoundedScrollHandler`. When set, `onWheelEvent` calls the filter before processing; `false` swallows the event (still calls `preventDefault`).
- Carousel installed `() => false` during snap, cleared on completion.
- **Problem**: suppresses ALL wheel input during snap, including fresh deliberate gestures. The user can't interrupt a snap with a new scroll. Acceptable for short snaps but not ideal.

## Proposed fix

The dead-zone (approach A) and the wheel filter (approach C) are both sound independently. The issue was combining them with the right thresholds. A clean solution:

1. **Wheel filter at the source** (approach C) — suppress momentum during snap in `onWheelEvent` so it never reaches `scrollPosition`. This eliminates the fight completely.

2. **Allow fresh gesture interrupts** — instead of `() => false`, the filter should check the *time since last wheel event*. Momentum events arrive in rapid succession (< 30ms apart). A fresh gesture after a gap (> 80ms since last event) should cancel the snap and pass through. This distinguishes momentum tail from deliberate input without relying on delta magnitude.

3. **Dead-zone for direction-aware snap** (approach A) — within 25% of the nearest boundary, snap to nearest regardless of scroll direction. This prevents small scrolls from committing to the next/previous item.

4. **Consider replacing the spring with ease-out for idle snaps** — the spring's acceleration-from-rest profile is most noticeable on idle/click snaps where there's no incoming velocity to mask it. A simple ease-out for the v=0 case would feel crisper while keeping the velocity-seeded spring for flings (where the acceleration phase is masked by the incoming momentum).

## Files

- `src/plugins/carousel/plugin.ts` — `performSnap`, `createSnapSpring`, `onAfterScroll`, snap constants
- `src/core/runway.ts` — `onWheelEvent`, `BoundedScrollHandler` interface
- `src/core/types.ts` — `PluginContext` interface (for `setWheelFilter` if added)
- `src/core/create.ts` — wiring `setWheelFilter` to the bounded handler

## Current state

`SPRING_STIFFNESS` has been lowered to `0.0015` (settle ~3.9s) as a temporary measure to slow the snap transition and reduce the perceived elasticity. The momentum fight and dead-zone are not yet addressed.
