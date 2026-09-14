# RFC-014 implementation plan

Updated: **2026-09-14** · Status: **2.7.0 opt-in released; 3.0 default decision open**.
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
- [x] **Input decision recorded 2026-09-14: candidate B.** Candidate A (native
      runway 16x, idle-only rebase) fails its own gate on both physical devices:
      iOS 955 hard-edge hits, max fling 215% of runway; Android 751 hits, 226%.
      Writes during momentum stayed 0 on both. Details in the RFC decision record.
- [x] Devices recorded: iPhone SE (2nd gen, 2020) on iOS 26.6.1 Safari; Pixel 8a on
      Android 17 Chrome.
- [x] Synthetic telemetry recorded for the vertical axis on the iPhone SE in Chrome for
      iOS (all counters zero, 13 nodes, peak 2.9 px/ms); candidate A also fails in that
      browser (361 hard-edge hits, 145% of runway). Horizontal-axis export optional.

**No-go:** retain current native default/bounded opt-in until a candidate meets the
contract. Do not announce removal of `scroll.mode` before this decision.

## 4. Integrate the chosen driver as opt-in (2.7, after input decision)

Additive release: `scroll.mode: "synthetic"` beside native and bounded, defaults
unchanged, shipped as its own entry so the base bundle is unaffected for consumers
who do not opt in.

- [x] Connect driver to core logical position, render, idle and cancellation hooks
      through the existing `BoundedScrollHandler` seam (floor/vlist#130, 2026-09-14).
- [x] Define a non-cancelling `shiftBy(delta)`: measurement corrections (autosize,
      transition) shift position and any animation target while preserving gesture
      state and velocity; `scrollTo` keeps its cancelling semantics (#131).
- [x] Route the transition plugin's raw `scrollTop`/`scrollHeight` reads through
      logical position and size cache (#131; also fixes bounded-mode FLIP endpoints,
      transition row +1.8 → +2.0 KB accepted).
- [x] Specify the clipping layer (stage `overflow: clip`, viewport cross-axis native)
      and the clock contract (`event.timeStamp` for input, frame timestamps for
      animation, suspension measured between frames only) with tests (#130).
- [x] Verify real table header sync/cross-axis keyboard and touch behavior (Chrome
      touch emulation in #130/#131; physical-device sheet still pending).
- [x] Verify groups, autosize anchor, snapshots and changing totals (#130/#131).
      Carousel wrap is unsupported with synthetic mode in this release and throws (#132).
- [x] Selection and interactive-child behavior verified (#130). Sortable is unsupported
      with synthetic mode in this release and throws (#132); arbitration is future work.
- [x] Audit main-axis native reads/writes and external scroll events; legitimate
      native cross-axis operations remain supported (driver makes none; transition
      reads routed in #131).
- [x] RTL policy for the synthetic driver, decided 2026-09-14: explicit guard. RTL
      horizontal lists throw in synthetic mode; vertical lists on RTL pages allowed;
      native and bounded untouched; support planned as a non-breaking addition
      (floor/vlist#134).
- [x] `page()` remains the external native-document provider in native mode and
      throws with synthetic mode (#132).
- [x] Document supported plugin combinations and known limitations of the opt-in
      mode in README, npm-readme and the `[Unreleased]` changelog (#132); release
      notes at the minor.
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
      Decided 2026-09-14: the scrollbar stays a plugin, required by documentation.
- [x] Native look by default: per-platform defaults for width, overlay vs gutter,
      radius and auto-hide timing (macOS, Windows, Android), from AzzaAzza69's
      requirement in floor/vlist#108 (#143).
- [x] Honour the standard `scrollbar-width` and `scrollbar-color` properties read from
      the container's computed style, so existing stylesheets keep working (#143).
- [x] Documented one-to-one mapping from each `::-webkit-scrollbar*` pseudo-element to a
      plugin class or `--vlist-scrollbar-*` variable; the pseudo-elements themselves are
      not mirrored (non-standard, Chromium-only, not readable from script) (#144).
- [x] Implement keyboard, focus, pointer and semantics (floor/vlist#142 on `next`,
      2026-09-14: role=scrollbar, ARIA range and "Row N of M", focus-visible, one
      pointer-capture path). Screen-reader pass: VoiceOver macOS passed 2026-09-15 on a
      local build of `next` (bar reachable by Tab, role and row value announced, keys
      and adjust gesture move it, list navigation intact). VoiceOver iOS and TalkBack
      pending.
- [x] Forced colors, horizontal orientation and huge totals (20M rows) tested (#144);
      reduced motion is handled by the driver, not the bar.
- [x] Scrollbar plugin +2.0 → +2.8 KB gzipped across #142-#144 (402 + 394 + 0 bytes),
      inside its budget; base unchanged.
- [ ] Specify migration for `scroll.mode` and `scrollbar: "native"` and public internals.

## 6. Release gates

**2.7 opt-in release**

- [x] Five prototype review defects fixed and covered by the harness (vlist.io#56,
      deployed 2026-09-13).
- [x] Boundary policy for the opt-in mode recorded (2026-09-13).
- [x] Section 4 checklist complete for the supported plugin set; unsupported
      combinations throw. Integration branch `feat/synthetic-input` at c7db431e
      (PRs #130, #131, #132), verified 2026-09-14 from a clean export: 3530 tests,
      typecheck, build with declarations, base 9.8 KB, synthetic +2.5 KB.
      Official benchmark scenarios landed 2026-09-14 (vlist.io#59, vlist#133):
      matched logical native/bounded/synthetic scenarios plus an in-page pointer-fling
      scenario for the synthetic driver; 60 FPS, zero frames over 32 ms at 10K to
      1M rows on c7db431e. RTL guard merged (#134). Nothing remains open before the
      minor except the merge of `feat/synthetic-input` into staging and the release
      prep (jvial); the synthetic telemetry export stays optional.
- [x] Required typecheck, tests, browser checks and size measurements pass; base
      bundle unchanged for non-opt-in consumers (clean export of 20aaa281:
      3536 tests, typecheck, build with declarations, base 9.8 KB, synthetic +2.6 KB).

**2.7.0 released 2026-09-14** (floor/vlist v2.7.0, npm latest). Follow-ups: framework
adapters cannot reach the `vlist/synthetic` entry yet; vlist.io docs page for the mode;
staging benchmark build should resolve vlist from the staging clone (`VLIST_BENCH_ROOT`).

**3.0 shape (decided 2026-09-14)**

- Core: synthetic input is the default and the only model in core. Bounded mode,
  `scroll.mode`, the runway, rebase and `baseOffset` are removed. `scale()` is removed.
- Native scrolling moves to an opt-in `vlist/native` entry, kept unless the gate review
  shows no consumer needs parent handoff, find-in-page or native scrollbar semantics.
- The custom scrollbar remains a plugin, required by documentation, not bundled.
- Size gate: 3.0 base at or below 9.9 KB gzipped with the driver included; plugin rows
  unchanged or smaller, except the scrollbar plugin, whose accessibility and native-look
  work has its own budget of +2.8 KB (from +2.0). Simplification pays for the driver: one
  wheel handler, no runway or `baseOffset` split, no mode branching, simpler pipeline.
- Integration branch `next` opened 2026-09-14 at vlist staging 2.7.2; series 1
  (scrollbar gate) dispatched to Codex.
- Gate order before the flip: scrollbar accessibility, RTL support in the driver,
  adapter adoption in all plugins (the vehicle for removing `baseOffset` reads), page
  mode under the external-scroll seam, deprecation ladder. Work proceeds on a `next`
  integration branch while 2.7 gathers consumer feedback.

**3.0 default decision (conditional)**

- [ ] Consumer feedback from the opt-in mode recorded alongside the A/B comparison.
- [ ] Scrollbar, page, RTL and migration gates closed.
- [ ] Only then flip the default or delete the native viewport path, if still selected.

Adapter canonicalization and distance-based overscan remain separately scoped work.
