# RFC-014 implementation plan

Updated: **2026-09-11** · Status: **prototype authorized; release gates open**.
Canonical: [RFC-014: Scroll Input Model](../rfcs/RFC-014-Scroll-Input-Model.md). Supersedes the rejected RFC-013.
The old [native-runway plan](rfc-013-native-runway-plan-historical.md) is historical.

## 1. Reconcile and specify

- [x] One canonical RFC; preserve older drafts with superseded notices.
- [x] Distinguish architecture, specification and release approval.
- [x] Specify synthetic gesture ownership, signed sampling, cancellation and bounds.
- [x] Remove claims of cheap automatic touch chaining or reusable unsigned velocity.
- [x] Keep the input/default choice open; decouple overscan and adapter cleanup.
- [x] Separate the 2.7 opt-in milestone from the conditional 3.0 default decision.

## 2. Independent input experiments

A exists at `/gate-b/` (native runway with idle rebase). B's source lives at
`/gate-b/synthetic/`; the deployed review target is `vlist.io/experiments/synthetic/`
(standalone pointer-driven logical renderer). Neither changes
vlist production code. B's native range input is a test control, not Gate SB.

- [x] Implement synthetic state machine, elapsed-time inertia and bounded rendering.
- [x] Include vertical/horizontal modes with native cross-axis overflow.
- [x] Provide jump, smooth navigation, slider, resize and interruption controls.
- [x] Instrument bounds, native main-axis movement, render coverage, frame gaps,
      cancellation and cross-axis events; export a timestamped result.
- [x] Deterministic motion tests and real-Chrome smoke checks pass (2026-09-10; see README).
- [ ] Fix the five review defects recorded in RFC-014 (focus-driven stage scroll, drag on
      links, catch-tap click, keyboard with descendant focus, abandoned smooth navigation)
      and cover each in the browser harness, including a drag after multitouch on the
      same page.
- [x] User-reported physical-device test of B on iOS and Android received
      2026-09-11: “works beautifully.” Recorded in the prototype README.
- [ ] Detailed scenario/device record and A/B comparison supplied; no per-scenario
      results or native-runway comparison are inferred from the overall feedback.

B is an honest experiment: same-axis touch does not chain to the parent at any
list boundary, including gestures starting at an edge. The page makes this visible.
No reviewer may interpret ignoring a second pointer or stopping `preventDefault`
as proof of native zoom or chaining behavior.

## 3. Choose input using recorded results

On physical iPhone/Safari and Android/Chrome compare:

1. Fast/repeated flings, slow drag, reversal, catch, frame gaps, resize/background.
2. Cross-axis table-like pan, diagonal intent and pinch zoom (before and during drag).
3. Nested page scrolling, including gestures starting at and arriving at a list edge.
4. Smooth navigation and slider/keyboard interruption; tap vs drag behavior.
5. Low-end Android responsiveness and reduced-motion behavior.

The decision must name devices/OS/browser versions and link exported telemetry plus
human observations. Counters do not establish perceived feel or accessibility.
For B, explicitly accept or reject the prototype boundary policy for the intended
product; improving parent chaining requires a new specified experiment. For A,
measure runway exhaustion and rebase safety; a larger factor is not proof.

- [x] **Boundary policy, 2.7 opt-in mode: accepted 2026-09-13** (Codex
      recommendation, #127). Hard same-axis stop at both edges, no parent handoff,
      including gestures starting inside an edge-pinned list. Document it as a
      known limitation of the opt-in mode; native mode remains for pages that need
      parent scrolling. Not a default decision.
- [ ] Per-device result sheet recorded: devices, OS and browser versions, exported
      telemetry for both axes, checklist outcomes.

**No-go:** retain current native default/bounded opt-in until a candidate meets the
contract. Do not announce removal of `scroll.mode` before this decision.

## 4. Integrate the chosen driver as opt-in (2.7, after input decision)

Additive release: `scroll.mode: "synthetic"` beside native and bounded, defaults
unchanged, shipped as its own entry so the base bundle is unaffected for consumers
who do not opt in.

- [ ] Connect driver to core logical position, render, idle and cancellation hooks
      through the existing `BoundedScrollHandler` seam.
- [ ] Define a non-cancelling `shiftBy(delta)`: measurement corrections (autosize,
      transition) shift position and any animation target while preserving gesture
      state and velocity; `scrollTo` keeps its cancelling semantics.
- [ ] Route the transition plugin's raw `scrollTop`/`scrollHeight` reads through
      logical position and size cache.
- [ ] Specify the clipping layer (stage `overflow: clip`, viewport cross-axis native)
      and the clock contract (`event.timeStamp` for input, frame timestamps for
      animation, suspension measured between frames only) with tests.
- [ ] Verify real table header sync/cross-axis keyboard and touch behavior.
- [ ] Verify carousel wrap, groups, autosize anchor, snapshots and changing totals.
- [ ] Specify selection/sortable gesture ownership and interactive-child behavior.
- [ ] Audit main-axis native reads/writes and external scroll events; legitimate
      native cross-axis operations remain supported.
- [ ] Verify RTL policy for the selected engine, with support tests or explicit guard.
- [ ] Keep `page()` as external native-document provider; preserve/reword size guard;
      maintain explicit page/carousel conflict.
- [ ] Document supported plugin combinations and known limitations of the opt-in
      mode (boundary policy, scrollbar accessibility) in the 2.7 release notes.
- [x] **Size budget for the synthetic entry: 2.5 KB gzipped, accepted 2026-09-14**
      (floor/vlist#130). The bounded handler's 1.1 KB covers wheel and rebase only;
      the entry replaces native touch (sampling, multitouch, capture, click
      suppression), native keyboard scrolling and the clip lifecycle, and component
      ablation showed no single removable feature after diagnostics, reason strings,
      per-commit timers and the two-phase keyboard path were removed. Base bundle
      unchanged at 9.8 KB (+17 bytes for the factory hook). PRs (b) and (c) fit
      inside the budget; any growth needs a new decision.
- [x] **Performance parity measured 2026-09-14** on the same build, 1M rows, Chrome
      touch fling: every frame 16.7 ms at 1x and 6x CPU throttling, no long tasks;
      main-thread cost per pixel travelled 0.090 ms (synthetic) vs 0.094 ms (bounded);
      style recalculation higher for synthetic (8.2 vs 2.5 ms per fling) because rows
      move from JavaScript. Follow-up candidate, separately gated: translate the stage
      once per frame with an anchored baseOffset to cut per-frame style writes.

## 5. Production scrollbar and migration

Can be designed independently; must finish before native viewport removal.

- [ ] Decide core-vs-plugin bundling, default/disable/customization API, dup guard.
- [ ] Implement keyboard, focus, pointer and semantics; test with screen readers.
- [ ] Test forced colors, theming, reduced motion, horizontal orientation, huge totals.
- [ ] Measure net bundle impact including the default scrollbar and gesture driver.
- [ ] Specify migration for `scroll.mode` and `scrollbar: "native"` and public internals.

## 6. Release gates

**2.7 opt-in release**

- [ ] Five prototype review defects fixed and covered by the harness.
- [ ] Physical-device decision on boundary policy recorded.
- [ ] Section 4 checklist complete for the supported plugin set; unsupported
      combinations throw.
- [ ] Required typecheck, tests, browser checks and size measurements pass; base
      bundle unchanged for non-opt-in consumers.

**3.0 default decision (conditional)**

- [ ] Consumer feedback from the opt-in mode recorded alongside the A/B comparison.
- [ ] Scrollbar, page, RTL and migration gates closed.
- [ ] Only then flip the default or delete the native viewport path, if still selected.

Adapter canonicalization and distance-based overscan remain separately scoped work.
