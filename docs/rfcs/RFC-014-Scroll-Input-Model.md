---
created: 2026-09-10
updated: 2026-09-13
status: draft
---

# RFC-014: Scroll Input Model

**Status:** Draft — direction approved, prototype authorized, production input choice open  
**Author:** floor  
**Type:** Core Architecture  
**Created:** 2026-09-10  
**Amended:** 2026-09-13 — prototype review findings folded into the contract and gates; 2.7 opt-in and 3.0 milestones separated  
**Target:** vlist 2.7 (opt-in synthetic mode, additive); a separate, conditional 3.0 decision for any default change or native-path removal  
**Supersedes:** RFC-013 (Unified Scroll Model draft; reviewed as *Spatial Navigation Model* in [discussion #117](https://github.com/floor/vlist/discussions/117), rejected)  
**Extends:** [RFC-012: Logical Scroll Model](RFC-012-Logical-Scroll-Model.md)  
**Discussion:** [#127](https://github.com/floor/vlist/discussions/127)  

RFC-012 settled where the scroll position lives. This RFC settles where scroll
input comes from. It replaces RFC-013, which mandated a bounded-only model with the
native viewport path removed and was rejected by the June committee (Claude
conditionally approving, Codex and Grok rejecting). The production choice between a
hardened native runway and synthetic touch is open and will be made on physical-device
results. This document is not a new committee vote and not approval to change the
production default.

## Direction

A list has one logical position and a visible region; rendering projects items in
that region into a small DOM window. “Camera over virtual space” is useful internal
vocabulary. The public 1D APIs remain `scrollToIndex` and pixel-equivalent
`getScrollPosition`.

One logical rendering contract can accept multiple input providers. It does not
require replacing native touch. The production choice between a hardened native
runway and synthetic touch remains open until measured on physical devices.

Scope is 1D. Native cross-axis overflow (for example, a vertical table's columns)
must keep working. 2D virtualization, Z, spatial indexes, new camera APIs, and
rubber-band physics are outside this change. Overscan distance/cap work is an
independent proposal and is not a prerequisite for this input experiment.

## Milestones

| Milestone | Scope | Version |
|---|---|---|
| Opt-in | `scroll.mode: "synthetic"` beside native and bounded; existing defaults, configuration and plugin behavior unchanged; shipped as its own entry so the base bundle does not grow for consumers who do not opt in; unsupported combinations (page, carousel wrap until integrated) throw with a clear message; known limitations documented | 2.7 (minor, additive) |
| Default change | Synthetic as default, deprecation or removal of `scroll.mode` and `scrollbar: "native"`, native viewport path deleted, mandatory custom scrollbar | 3.0, only if the Release gate closes and the device decision still selects B |

The opt-in milestone follows the RFC-012 precedent, where bounded mode shipped as
opt-in in 2.x. Real consumer usage of the opt-in mode is an input to the default
decision. The A/B comparison informs that decision; it does not block the opt-in
release once the Input and Integration gates below are met for the opt-in surface.

## Current implementation and alternatives

v2.6.3 defaults to native scrolling; bounded mode is opt-in. The bounded handler
stores absolute logical pixels and a `baseOffset`; its native scroll callback can
write `scrollTop` while handling a scroll event. Unit tests cannot certify the
effect of those writes on physical-device momentum. The adapter remains a wrapper
over state; making it canonical is separate work.

| Candidate | Main-axis content | Input risk to measure |
|---|---|---|
| A: hardened native runway | Bounded viewport multiple | Native fling exhausts runway; idle detection/rebase interrupts motion |
| B: synthetic touch | Viewport sized | Gesture ownership, parent scrolling, cancellation, main-thread latency, feel |

`/gate-b/` is the existing standalone A experiment, not the shipped v2 handler.
`/gate-b/synthetic/` is the source of the standalone B experiment; the deployed
review target is [vlist.io/experiments/synthetic/](https://vlist.io/experiments/synthetic/)
(`?axis=x` horizontal, `native/` runway comparison). Neither certifies production
plugin compatibility. B is a prototype candidate, not the chosen default.

## Synthetic prototype contract

The prototype uses Pointer Events and a signed gesture sampler. It does not reuse
the unsigned render-speed tracker in `vlist/src/core/velocity.ts`.

| State | Entry / exit |
|---|---|
| idle | No owned gesture or animation |
| axis-pending | One touch/pen begins; cancel existing animation; wait for 6px intent |
| tracking | Main-axis movement dominates cross-axis by 1.2; own main-axis deltas |
| inertia | Release with fresh signed velocity; integrate exponential decay by elapsed time |
| animating | Programmatic smooth navigation; shares the same animation scheduler |
| cancelled | Cross-axis intent, multitouch, native cancellation, or external navigation during touch; no reacquisition until release |

Rules:

- Vertical uses `touch-action: pan-x pinch-zoom`; horizontal uses `pan-y pinch-zoom`.
  Native cross-axis scrolling and pinch zoom are permitted from gesture start.
  Pointer cancellation from browser-owned gestures stops synthetic motion.
- **No synthetic-to-native same-axis touch chaining is claimed.** A gesture that
  reaches a logical edge stops there until lift. With this axis policy, even a new
  same-axis gesture starting inside an edge-pinned list does not scroll its parent.
  Start outside the widget to scroll the page. This is a conspicuous experimental
  limitation and an unresolved product decision, not an accepted regression.
- Wheel at a logical edge is left uncancelled; consumed wheel events do not forward
  residual delta to the parent. Ctrl-wheel is left to browser zoom.
- A second touch cancels tracking/inertia; no single-finger resumption until all
  touches end. Pinch permission comes from CSS, not just ignoring the second finger.
- A new touch, wheel, keyboard command, slider drag, or programmatic navigation
  cancels the preceding animation. Only one animation owns position at a time.
- Resize clamps position and cancels motion. Hidden page/window blur cancels it too.
  Touch/pointer cancellation never starts inertia. A frame pause over 100ms stops
  inertia rather than producing a large catch-up jump; programmatic smooth navigation
  is not abandoned and lands on its target. *(Amended 2026-09-13.)*
- Release velocity uses signed pointer deltas, a direction-reversal reset and a
  80ms freshness limit; clamped to 3px/ms. Inertia decays at 0.006/ms and stops below
  0.02px/ms or at bounds. These are trial parameters, not platform parity claims.
- A drag may begin on any descendant, including links and buttons; the intent
  threshold separates a tap from a drag, as native scrolling does. Only range inputs,
  text inputs and editable content are excluded, because a drag has its own meaning
  there. A tap that interrupts inertia or an animation produces no click. Click
  suppression is per gesture, not a timer. Sortable/selection plugin arbitration
  remains an integration gate. *(Amended 2026-09-13: the prototype excludes all
  interactive descendants and uses a 500 ms window; both are review defects, see below.)*
- Main-axis content is viewport-sized. Rendering never writes native main-axis
  scroll position. The clipping layer is a separate element from the native
  cross-axis scroller: the viewport keeps `overflow-x: auto; overflow-y: hidden`
  (or the converse), and the stage inside it uses `overflow: clip` on both axes so
  it is not a scroll container and its clipped rows do not contribute to the
  viewport's scrollable overflow. Setting `clip` on one axis of the viewport itself
  does not work; `auto` plus `clip` computes to `hidden`. Tests assert both the
  computed `overflow` of the stage and that focusing an off-viewport row leaves
  every main-axis `scrollTop` at 0. Cross-axis header sync reads native cross-axis
  scroll.
- Keyboard navigation works while any non-interactive descendant has focus, not only
  when the viewport itself is focused.
- Clock contract: input samples and release freshness use `event.timeStamp`;
  animation progress uses animation-frame timestamps. Inertia starts its frame clock
  on the first animation frame after release, not at the release timestamp, so
  delayed event delivery or a slow first frame cannot trip the 100 ms suspension rule
  before motion has begun. The suspension rule measures gaps between animation
  frames only.

These decisions are testable. There is no “50 lines + 10 lines” scope estimate.

## Approval and release gates

**Architecture approval** accepts the logical contract and a bounded experiment.
**Specification approval** requires explicit interaction choices and integration
plans. **Release approval** requires implemented, tested behavior. They are separate.

| Gate | Required before removing the native viewport path |
|---|---|
| Input | Physical iPhone/Safari and Android/Chrome results; explicit accept/reject of boundary behavior, axis locking and zoom; candidate chosen |
| Integration | Table cross-axis pan/header sync, autosize anchoring, carousel wrap, groups, snapshots, sortable/selection and programmatic interruption verified against the chosen driver |
| Scrollbar | Default/disable/customization/duplicate-install API specified; keyboard, focus, pointer, screen-reader and forced-colors checks implemented; measured net bundle cost |
| Page | Native document provider behind the external-scroll seam; retain size guard with useful message; carousel conflict remains explicit |
| RTL | Supported and tested axis semantics or explicit unsupported guard; don't retain runway-specific requirements if synthetic wins |
| Migration | Deprecation/migration for `scroll.mode` and native scrollbar configuration; API compatibility, full tests, size and browser checks |

The prototype's native range input is a test control, **not completion of the
production virtual-scrollbar accessibility gate**. Passing DOM snapshots alone
does not certify screen-reader behavior.

No requirement to migrate every direct state read to the adapter precedes release.
Audit main-axis behavior and route ownership through the chosen contract; native
cross-axis reads are legitimate. Adapter canonicalization can follow independently.

## Decision record and verification

**2026-09-11 — positive device feedback.** The user tested the deployed synthetic
experiment on both iOS and Android and reported that it “works beautifully.” This
supports continuing candidate B evaluation. It is an overall qualitative result;
device/browser versions, individual checklist outcomes and telemetry were not
supplied. Integration follows the recorded decision in the plan, not this report.
No production plugin, scrollbar-accessibility, native A comparison, or
default-change gate is marked complete by it.

**2026-09-13 — prototype review.** A code review of the deployed prototype
(vlist.io commit c5d28d6) reproduced these defects with Chrome touch emulation
against production. Each must be fixed and covered by the browser harness before
the Input gate can close:

1. Focusing a link in an overscan row scrolls the stage natively (`overflow: hidden`
   is a scroll container); the model and the “native main scroll” counter see 0.
2. A drag starting on a link or button never scrolls.
3. A tap that catches a fling more than 500 ms after release fires a click on the
   row underneath.
4. Arrow keys do nothing while a row descendant has focus.
5. A frame pause over 100 ms abandons smooth navigation short of its target.

Not defects, but decisions the review makes explicit: the maximum fling travel
(3 px/ms clamp, 0.006/ms friction) is about 500 px, roughly a third of iOS default
deceleration, and must be accepted or retuned on device; the driver and the browser
each apply their own axis-intent slop, so diagonal starts move the list a few pixels
before a cross-axis `pointercancel`. Integration blockers identified in vlist core:
sortable takes `pointerdown` on the same element with a 5 px threshold and no
`touch-action`, and autosize/transition corrections route through a cancelling
`scrollTo`, so the driver needs a non-cancelling shift primitive.

**2026-09-13 — boundary policy for the opt-in mode: accepted.** Same-axis touch
in synthetic mode stops hard at either list edge and does not hand the gesture to
the parent, including a gesture that begins inside an already edge-pinned list. This
is accepted for the 2.7 opt-in mode only, on Codex's recommendation in
[#127](https://github.com/floor/vlist/discussions/127), and must be documented
as a known limitation of that mode; applications that need native parent scrolling
keep the existing native mode. Accepting it for an opt-in feature does not approve
it as a default. Parent chaining, if ever required, is a different ownership design
to be specified and measured separately. The per-device result sheet (devices, OS
and browser versions, exported telemetry) is still to be recorded before the opt-in
release.

**2026-09-14 — opt-in implementation complete on `feat/synthetic-input`.** Codex
implemented and Claude reviewed three PRs (floor/vlist#130, #131, #132): the
`vlist/synthetic` entry with `scroll.mode: "synthetic"`, the non-cancelling
`shiftBy` with autosize and transition corrections routed through it, and the
guards plus documentation. Verified from a clean export: 3530 tests, typecheck,
base bundle unchanged at 9.8 KB, synthetic entry +2.5 KB gzipped (accepted
budget), frame timing and main-thread cost per pixel on par with bounded mode.
The five prototype defects are fixed and live. Not yet done: RTL policy for the
driver, the official benchmark scenario, the per-device result sheet, and the
merge into staging for the 2.7 minor, which is jvial's decision.

**2026-09-14 — Input gate: candidate B chosen; candidate A rejected on device.**
jvial ran the native runway comparison (candidate A: bounded runway 16x viewport,
idle-only rebase at 160 ms, 1,000,000 rows of 52 px) on a physical iPhone and a
physical Android phone. The page's own three pass conditions are: no scrollTop
writes during momentum, zero hard-edge hits, and a single fling shorter than the
runway. Results:

| Platform | Writes during momentum | Hard-edge hits | Max fling | Runway | Fling vs runway | Frame gaps >32 ms |
|---|---|---|---|---|---|---|
| iOS Safari | 0 | 955 | 35,375 px | 16,470 px | 215% | 10 |
| Android Chrome | 0 | 751 | 27,560 px | 12,180 px | 226% | 1 |

The idle-only rebase policy held (no writes during momentum), but a single native
fling travels more than twice the runway on both platforms and pins against the
runway edge for hundreds of frames: the fling stops dead mid-momentum, as the June
committee predicted. A 40x runway would be needed to contain these flings, and the
plan does not accept a larger factor as proof. Candidate A is rejected. Candidate B
(synthetic touch) was reported as working well on both devices; its opt-in
implementation is complete on `feat/synthetic-input`. Device models and OS/browser
versions are to be appended to the result sheet.

Implementation sequence and live checklists:
[implementation plan](../refactor/rfc-014-implementation-plan.md).
Prototype usage, telemetry and physical-device result sheet:
[prototype README](../../gate-b/synthetic/README.md).

Keep current defaults until the gates close. If B's interaction compromises are not
acceptable, continue A testing or retain the current opt-in deployment. No deadline,
line-count estimate, emulator result, or committee vote substitutes for device data.

Historical lineage: [Unified draft](../refactor/rfc-013-unified-scroll-historical.md),
[native-runway plan](../refactor/rfc-013-native-runway-plan-historical.md),
[integrated proposal](../refactor/rfc-013-integrated-proposal-historical.md), and #117.

Platform contract: [W3C Pointer Events, touch-action](https://www.w3.org/TR/pointerevents/#the-touch-action-css-property).
Browser gesture policy is established at gesture start; stopping `preventDefault`
later is not a specified mechanism for transferring a captured gesture to a parent.
`pointermove` is cancelable, but cancelling it does not affect native panning or
zooming; only `touch-action`, fixed at gesture start, does. The static `touch-action`
policy above is therefore the only ownership mechanism this driver has, and it cannot
provide same-axis parent chaining. If chaining is ever required, it needs a different
ownership design, for example Touch Events with a look-ahead before the first
`preventDefault`, or synthesized parent scrolling; either is a new driver design to
be specified and measured, not a parameter of this one.
